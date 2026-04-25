import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanBadge } from "@/components/shared/PlanBadge";
import { toast } from "@/hooks/use-toast";
import { Check, Zap, Crown, Tag } from "lucide-react";

const PLANS = [
  {
    id: "PRO",
    name: "Pro",
    price: "$12/mo",
    icon: Zap,
    color: "primary",
    features: [
      "Unlimited projects",
      "AI allocation engine",
      "Allocation history (30 days)",
      "Project chat",
      "Priority support",
    ],
  },
  {
    id: "TEAM",
    name: "Team",
    price: "$29/mo",
    icon: Crown,
    color: "secondary",
    features: [
      "Everything in Pro",
      "Advanced analytics",
      "Custom allocation rules",
      "Allocation history (1 year)",
      "Team billing dashboard",
      "Dedicated account manager",
    ],
  },
];

export default function BillingPage() {
  const queryClient = useQueryClient();

  // ✅ REPLACED: useGetMe()
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
  });

  // ✅ REPLACED: useListBillingHistory()
  const { data: history } = useQuery({
    queryKey: ["billing-history"],
    queryFn: async () => (await api.get("/billing/history")).data,
  });

  // ✅ REPLACED: useCreateBillingOrder()
  const createOrder = useMutation({
    mutationFn: (plan: string) =>
      api.post("/billing/create-order", { plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  // ✅ REPLACED: useApplyCoupon()
  const applyCoupon = useMutation({
    mutationFn: (code: string) =>
      api.post("/billing/apply-coupon", { coupon_code: code }),
  });

  const [coupon, setCoupon] = useState("");
  const [couponResult, setCouponResult] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const currentPlan = me?.plan_tier ?? "FREE";

  const handleUpgrade = async (planId: string) => {
    setPendingPlan(planId);
    try {
      const res = await createOrder.mutateAsync(planId);

      toast({
        title: `Order created — ${res.data?.order_id ?? ""}`,
        description: "Complete payment to activate your plan.",
      });

    } catch {
      toast({ title: "Failed to create order", variant: "destructive" });
    } finally {
      setPendingPlan(null);
    }
  };

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;

    try {
      const res = await applyCoupon.mutateAsync(coupon);

      const discount = res.data?.discount_percent ?? 0;

      setCouponResult(`${discount}% off applied!`);

      toast({
        title: "Coupon applied!",
        description: `${discount}% discount`,
      });

    } catch {
      setCouponResult("Invalid coupon code.");
      toast({ title: "Invalid coupon", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your plan and billing.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xl font-bold text-foreground">{currentPlan}</p>
              <PlanBadge plan={currentPlan} />
            </div>
          </div>
          {currentPlan !== "FREE" && (
            <Button
              variant="outline"
              size="sm"
              className="border-border text-destructive hover:text-destructive hover:border-destructive"
            >
              Cancel plan
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {PLANS.map(plan => {
          const isCurrentPlan = currentPlan === plan.id;
          const isPending = pendingPlan === plan.id;
          const borderColor =
            plan.color === "primary"
              ? "border-primary/40"
              : "border-secondary/40";

          const btnClass =
            plan.color === "primary"
              ? ""
              : "bg-secondary hover:bg-secondary/90";

          return (
            <div
              key={plan.id}
              className={`bg-card border rounded-xl p-5 ${
                isCurrentPlan ? borderColor : "border-border"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <plan.icon
                  className={`w-5 h-5 ${
                    plan.color === "primary"
                      ? "text-primary"
                      : "text-secondary"
                  }`}
                />
                <h3 className="font-bold text-lg">{plan.name}</h3>
              </div>

              <p
                className={`text-2xl font-bold mb-4 ${
                  plan.color === "primary"
                    ? "text-primary"
                    : "text-secondary"
                }`}
              >
                {plan.price}
              </p>

              <ul className="space-y-2 mb-6">
                {plan.features.map(f => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${btnClass}`}
                disabled={isCurrentPlan || isPending}
                onClick={() => handleUpgrade(plan.id)}
              >
                {isCurrentPlan
                  ? "Current plan"
                  : isPending
                  ? "Processing..."
                  : `Upgrade to ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold mb-3">Apply Coupon</h2>

        <div className="flex gap-2">
          <Input
            placeholder="COUPON CODE"
            value={coupon}
            onChange={e => setCoupon(e.target.value.toUpperCase())}
            className="bg-accent border-border font-mono"
          />

          <Button
            variant="outline"
            className="border-border"
            onClick={handleApplyCoupon}
            disabled={!coupon.trim() || applyCoupon.isPending}
          >
            <Tag className="w-4 h-4 mr-1" />
            Apply
          </Button>
        </div>

        {couponResult && (
          <p
            className={`text-sm mt-2 ${
              couponResult.includes("off")
                ? "text-green-400"
                : "text-destructive"
            }`}
          >
            {couponResult}
          </p>
        )}
      </div>

      {history && history.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Billing History</h2>

          <div className="space-y-2">
            {history.map((event: any) => (
              <div
                key={event.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {event.description ?? event.plan}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.created_at
                      ? new Date(event.created_at).toLocaleDateString()
                      : ""}
                  </p>
                </div>

                <span
                  className={`text-sm font-semibold ${
                    event.status === "completed"
                      ? "text-green-400"
                      : "text-amber-400"
                  }`}
                >
                  {event.amount
                    ? `$${event.amount}`
                    : event.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}