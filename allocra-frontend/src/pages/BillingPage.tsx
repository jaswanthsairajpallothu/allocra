import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Sparkles, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/hooks/useAuth";
import { billingApi } from "@/api/endpoints";
import { extractError } from "@/api/helpers";
import { loadRazorpay, openRazorpayCheckout } from "@/lib/razorpay";
import type { PlanTier } from "@/types";

type Plan = {
  name: string;
  tier: PlanTier;
  priceMonthly: string;
  priceAnnual?: string;
  tagline: string;
  limits: string[];
  features: string[];
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    tier: "FREE",
    priceMonthly: "₹0",
    tagline: "Get started",
    limits: ["1 workspace", "3 projects / workspace", "10 members / project"],
    features: ["Basic allocation", "Task management", "Team visibility"],
  },
  {
    name: "Pro",
    tier: "PRO",
    priceMonthly: "₹199",
    priceAnnual: "₹1,799 / year",
    tagline: "For growing teams",
    limits: ["3 workspaces", "6 projects / workspace", "20 members / project"],
    features: [
      "Advanced scoring + breakdown",
      "Workload visibility",
      "Allocation history",
      "Project chat + threads",
      "File uploads in chat",
      "Email notifications",
    ],
    featured: true,
  },
  {
    name: "Team",
    tier: "TEAM",
    priceMonthly: "₹499",
    priceAnnual: "₹3,799 / year",
    tagline: "Scale together",
    limits: ["10 workspaces", "12 projects / workspace", "20 members / project"],
    features: [
      "Risk engine",
      "Workload optimization suggestions",
      "Skill gap insights",
      "Analytics dashboard",
      "Team admin controls",
      "Activity log",
      "Priority support",
    ],
  },
];

const PLAN_RANK: Record<PlanTier, number> = { FREE: 0, PRO: 1, TEAM: 2 };

type FeatureRow = {
  label: string;
  free: boolean;
  pro: boolean;
  team: boolean;
};

const FEATURE_MATRIX: { group: string; rows: FeatureRow[] }[] = [
  {
    group: "Limits",
    rows: [
      { label: "Workspaces", free: true, pro: true, team: true },
      { label: "Projects per workspace", free: true, pro: true, team: true },
      { label: "Members per project", free: true, pro: true, team: true },
    ],
  },
  {
    group: "Core",
    rows: [
      { label: "Task management", free: true, pro: true, team: true },
      { label: "Team visibility", free: true, pro: true, team: true },
      { label: "Basic allocation", free: true, pro: true, team: true },
    ],
  },
  {
    group: "Collaboration",
    rows: [
      { label: "Project chat + threads", free: false, pro: true, team: true },
      { label: "File uploads in chat", free: false, pro: true, team: true },
      { label: "Email notifications", free: false, pro: true, team: true },
    ],
  },
  {
    group: "Allocation",
    rows: [
      { label: "Advanced scoring + breakdown", free: false, pro: true, team: true },
      { label: "Workload visibility", free: false, pro: true, team: true },
      { label: "Allocation history", free: false, pro: true, team: true },
      { label: "Workload optimization suggestions", free: false, pro: false, team: true },
      { label: "Skill gap insights", free: false, pro: false, team: true },
      { label: "Risk engine", free: false, pro: false, team: true },
    ],
  },
  {
    group: "Admin & Insights",
    rows: [
      { label: "Analytics dashboard", free: false, pro: false, team: true },
      { label: "Team admin controls", free: false, pro: false, team: true },
      { label: "Activity log", free: false, pro: false, team: true },
      { label: "Priority support", free: false, pro: false, team: true },
    ],
  },
];

function CellMark({ on }: { on: boolean }) {
  return on ? (
    <Check className="mx-auto h-4 w-4 text-success" aria-label="Included" />
  ) : (
    <X className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label="Not included" />
  );
}

export default function BillingPage() {
  const [coupon, setCoupon] = useState("");
  const { data: user, isLoading } = useMe();
  const qc = useQueryClient();
  const [pendingTier, setPendingTier] = useState<PlanTier | null>(null);

  const currentPlan: PlanTier = user?.plan_tier ?? "FREE";

  const handleUpgrade = async (tier: PlanTier) => {
    if (tier === "FREE") return;
    setPendingTier(tier);
    const planKey = tier.toLowerCase();
    try {
      // 1) Load Razorpay SDK
      const ok = await loadRazorpay();
      if (!ok) {
        toast.error("Failed to load Razorpay. Please retry.");
        setPendingTier(null);
        return;
      }

      // 2) Create order on backend
      const orderRes = await billingApi.createOrder(planKey, "monthly");
      const order = orderRes.data;
      if (!order?.order_id || !order?.key_id) {
        toast.error("Could not create order");
        setPendingTier(null);
        return;
      }

      // 3) Open Razorpay checkout
      openRazorpayCheckout({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Allocra",
        description: `Upgrade to ${tier}`,
        order_id: order.order_id,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: () => {
            setPendingTier(null);
            toast("Payment cancelled");
          },
        },
        handler: async (response) => {
          // 4) Verify payment server-side — only then plan updates
          try {
            await billingApi.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              plan: planKey,
            });
            // 5) Refresh user state
            await qc.invalidateQueries({ queryKey: ["auth", "me"] });
            toast.success(`Plan upgraded to ${tier}`);
          } catch (err) {
            toast.error(extractError(err) || "Payment verification failed");
          } finally {
            setPendingTier(null);
          }
        },
      });
    } catch (e) {
      toast.error(extractError(e) || "Failed to start checkout");
      setPendingTier(null);
    }
  };


  return (
    <div className="mx-auto max-w-6xl space-y-10 p-6 md:p-10">
      <header className="text-center">
        <Badge variant="secondary" className="mb-3">
          <Sparkles className="mr-1 h-3 w-3" /> Plans & Pricing
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Choose the plan that fits your team
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Switch or cancel anytime. Annual billing saves up to 25%.
        </p>
        {isLoading ? (
          <Skeleton className="mx-auto mt-4 h-6 w-48" />
        ) : (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
            <span className="text-muted-foreground">Current plan:</span>
            <span className="font-semibold">{currentPlan}</span>
          </div>
        )}
      </header>

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.tier;
          const isDowngrade = PLAN_RANK[p.tier] < PLAN_RANK[currentPlan];
          const isFree = p.tier === "FREE";
          const isPending = pendingTier === p.tier;
          const anyPending = pendingTier !== null;
          const disabled =
            isCurrent || isDowngrade || isFree || anyPending;

          let cta: string;
          if (isCurrent) cta = "Current Plan";
          else if (isFree) cta = "Free forever";
          else if (isDowngrade) cta = "Downgrade unavailable";
          else cta = `Upgrade to ${p.name}`;

          return (
            <Card
              key={p.tier}
              className={`relative flex flex-col p-6 transition-all ${
                p.featured
                  ? "border-primary shadow-[var(--shadow-lg)]"
                  : "border-border/60"
              } ${isCurrent ? "ring-2 ring-primary/40" : ""}`}
            >
              {p.featured && !isCurrent && (
                <Badge
                  className="absolute -top-2.5 right-4"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  Most popular
                </Badge>
              )}
              {isCurrent && (
                <Badge variant="secondary" className="absolute -top-2.5 left-4">
                  Current Plan
                </Badge>
              )}

              <div className="text-sm text-muted-foreground">{p.tagline}</div>
              <div className="mt-1 text-2xl font-bold">{p.name}</div>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">
                  {p.priceMonthly}
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              {p.priceAnnual ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  or {p.priceAnnual}
                </div>
              ) : (
                <div className="mt-1 text-xs text-muted-foreground">
                  Free forever
                </div>
              )}

              <div className="mt-5 space-y-3 text-sm">
                <div>
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Limits
                  </div>
                  <ul className="space-y-1.5">
                    {p.limits.map((l) => (
                      <li key={l} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {p.tier === "FREE" ? "Included" : `Everything in ${p.tier === "PRO" ? "Free" : "Pro"} +`}
                  </div>
                  <ul className="space-y-1.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Button
                className="mt-6"
                disabled={disabled}
                variant={p.featured && !isCurrent ? "default" : "outline"}
                onClick={() => handleUpgrade(p.tier)}
              >
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {cta}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Comparison table */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border/60 p-6">
          <h2 className="text-lg font-semibold">Compare plans</h2>
          <p className="text-sm text-muted-foreground">
            A detailed look at what's included in each tier.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%]">Feature</TableHead>
              <TableHead className="text-center">FREE</TableHead>
              <TableHead className="text-center">PRO</TableHead>
              <TableHead className="text-center">TEAM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FEATURE_MATRIX.map((group) => (
              <>
                <TableRow key={`g-${group.group}`} className="bg-muted/30 hover:bg-muted/30">
                  <TableCell
                    colSpan={4}
                    className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {group.group}
                  </TableCell>
                </TableRow>
                {group.rows.map((row) => (
                  <TableRow key={`${group.group}-${row.label}`}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-center">
                      <CellMark on={row.free} />
                    </TableCell>
                    <TableCell className="text-center">
                      <CellMark on={row.pro} />
                    </TableCell>
                    <TableCell className="text-center">
                      <CellMark on={row.team} />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="mx-auto max-w-md p-6">
        <h3 className="text-base font-semibold">Have a coupon?</h3>
        <div className="mt-3 flex gap-2">
          <Input
            placeholder="Enter coupon code"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => toast("Coupons not supported yet")}
          >
            Apply
          </Button>
        </div>
      </Card>
    </div>
  );
}
