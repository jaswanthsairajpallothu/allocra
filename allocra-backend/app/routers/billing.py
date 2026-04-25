import hashlib
import hmac
import json
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.auth import get_current_user
from app.models import User, Subscription, BillingEvent, PlanTier, SubscriptionStatus
from app.schemas import CreateOrder, VerifyPayment, CouponApply, BillingEventOut
from app.config import settings

router = APIRouter(prefix="/billing", tags=["billing"])

# Plan prices in INR paise (Razorpay uses smallest currency unit)
PLAN_PRICES = {
    ("PRO", "monthly"): 19900,   # ₹199
    ("PRO", "annual"): 179900,   # ₹1,799
    ("TEAM", "monthly"): 49900,  # ₹499
    ("TEAM", "annual"): 379900,  # ₹3,799
}

# Coupon codes — stored in backend, not frontend
COUPONS = {
    "PRODEV2026": PlanTier.PRO,
    "TEAMDEV2026": PlanTier.TEAM,
    "RESET2026": PlanTier.FREE,
}


@router.post("/apply-coupon", response_model=dict)
async def apply_coupon(
    body: CouponApply,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    code = body.code.strip().upper()
    if code not in COUPONS:
        raise HTTPException(status_code=400, detail="Invalid coupon code.")

    target_plan = COUPONS[code]
    current_user.plan_tier = target_plan
    await db.flush()

    return {
        "success": True,
        "plan": target_plan.value,
        "message": f"Plan updated to {target_plan.value} via coupon.",
    }


@router.post("/create-order", response_model=dict)
async def create_order(
    body: CreateOrder,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.RAZORPAY_KEY_ID:
        raise HTTPException(status_code=503, detail="Payment system not configured.")

    price_paise = PLAN_PRICES.get((body.plan.value, body.period))
    if not price_paise:
        raise HTTPException(status_code=400, detail="Invalid plan/period combination.")

    try:
        import razorpay
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        order_data = client.order.create({
            "amount": price_paise,
            "currency": "INR",
            "notes": {
                "user_id": str(current_user.id),
                "plan": body.plan.value,
                "period": body.period,
            },
        })
        return {
            "order_id": order_data["id"],
            "amount": price_paise,
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment gateway error: {str(e)}")


@router.post("/verify", response_model=dict)
async def verify_payment(
    body: VerifyPayment,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment system not configured.")

    # Verify signature
    generated_sig = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(generated_sig, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed. Signature mismatch.")

    # Upgrade plan
    current_user.plan_tier = body.plan

    # Record billing event
    amount = PLAN_PRICES.get((body.plan.value, "monthly"), 0) / 100
    event = BillingEvent(
        user_id=current_user.id,
        amount=amount,
        currency="INR",
        status="Paid",
        razorpay_payment_id=body.razorpay_payment_id,
        razorpay_order_id=body.razorpay_order_id,
        plan=body.plan,
    )
    db.add(event)

    # Create subscription record
    sub = Subscription(
        user_id=current_user.id,
        plan=body.plan,
        status=SubscriptionStatus.ACTIVE,
    )
    db.add(sub)
    await db.flush()

    return {"success": True, "plan": body.plan.value, "message": "Payment verified. Plan upgraded."}


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Razorpay webhook events."""
    body_bytes = await request.body()
    sig = request.headers.get("x-razorpay-signature", "")

    if settings.RAZORPAY_WEBHOOK_SECRET:
        expected = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode(),
            body_bytes,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    event = json.loads(body_bytes)
    event_type = event.get("event", "")

    # Handle subscription failure / cancellation
    if event_type in ("subscription.halted", "subscription.cancelled"):
        payload = event.get("payload", {}).get("subscription", {}).get("entity", {})
        rzp_sub_id = payload.get("id")
        if rzp_sub_id:
            sub = await db.scalar(
                select(Subscription).where(Subscription.razorpay_subscription_id == rzp_sub_id)
            )
            if sub:
                sub.status = SubscriptionStatus.CANCELLED
                user = await db.scalar(select(User).where(User.id == sub.user_id))
                if user:
                    user.plan_tier = PlanTier.FREE
                await db.flush()

    return {"received": True}


@router.get("/history", response_model=List[BillingEventOut])
async def billing_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BillingEvent)
        .where(BillingEvent.user_id == current_user.id)
        .order_by(BillingEvent.created_at.desc())
    )
    return result.scalars().all()
