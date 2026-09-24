"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Crown } from "lucide-react";
import { PageShell, PageHeader } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { useCheckout, useQuota, QUOTA_KEY } from "@/hooks/useQuota";
import { getErrorMessage } from "@/lib/api-error";
import { formatLongDate } from "@/lib/format";
import { SCAN_PACKS } from "@cardscan/config";
import type { Product } from "@/services/quota";

const PLANS: { plan: Extract<Product, "monthly" | "yearly">; name: string; price: string; per: string; note?: string }[] = [
  { plan: "monthly", name: "Monthly", price: "€4.99", per: "a month" },
  { plan: "yearly", name: "Yearly", price: "€39.99", per: "a year", note: "Save 33 %" },
];

const PACKS: { product: Product; scans: number; price: string; note?: string }[] = [
  { product: "scans_25", scans: SCAN_PACKS.scans_25, price: "€0.99" },
  { product: "scans_100", scans: SCAN_PACKS.scans_100, price: "€2.99", note: "Best value" },
];

const BENEFITS = ["Unlimited scans, no ads in between", "Supports the development of CardScan"];

/**
 * Premium. Searching, card data, prices and the collection stay free for everyone; this only lifts the daily
 * scan limit and removes ads. The subscription is billed by Stripe on the web.
 */
export default function PremiumPage() {
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { data: quota } = useQuota();
  const checkout = useCheckout();
  const status = params?.get("status");

  // Stripe confirms through a webhook, which can land a moment after the user is sent back here.
  useEffect(() => {
    if (status !== "success") return;
    const timer = setInterval(() => queryClient.invalidateQueries({ queryKey: QUOTA_KEY }), 3000);
    const stop = setTimeout(() => clearInterval(timer), 30_000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [status, queryClient]);

  return (
    <PageShell width="narrow">
      <PageHeader title="CardScan Premium" description="Scan as much as you like. Search, card data, prices and your collection are free for everyone." />

      {status === "success" && !quota?.premium && (
        <p className="mb-4 rounded-panel border border-success/25 bg-success/10 px-4 py-3 text-body">
          Thanks! Your subscription is being confirmed, it can take a minute to show up here.
        </p>
      )}
      {status === "canceled" && (
        <p className="mb-4 rounded-panel border border-hairline bg-base-200 px-4 py-3 text-body text-muted">
          The checkout was cancelled. You have not been charged.
        </p>
      )}

      {quota?.premium ? (
        <section className="rounded-panel border border-hairline bg-base-200 p-5 shadow-sheen">
          <p className="flex items-center gap-2 text-section font-semibold">
            <Crown className="h-5 w-5 text-warning" aria-hidden />
            You are premium
          </p>
          <p className="mt-2 text-body text-muted">
            {quota.premiumUntil ? `Your access runs until ${formatLongDate(quota.premiumUntil)}.` : "Your access is active."}
          </p>
        </section>
      ) : (
        <>
          <ul className="grid gap-2" aria-label="What Premium adds">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2.5 text-body">
                <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
                {benefit}
              </li>
            ))}
          </ul>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {PLANS.map((option) => (
              <section key={option.plan} className="flex flex-col rounded-panel border border-hairline bg-base-200 p-5 shadow-sheen">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-body font-semibold">{option.name}</h2>
                  {option.note && <span className="text-meta font-medium text-success">{option.note}</span>}
                </div>
                <p className="mt-3">
                  <span className="text-[1.75rem] font-semibold tabular-nums">{option.price}</span>{" "}
                  <span className="text-meta text-muted">{option.per}</span>
                </p>
                <Button
                  className="mt-4"
                  variant={option.plan === "yearly" ? "primary" : "outline"}
                  size="lg"
                  block
                  isLoading={checkout.isPending && checkout.variables === option.plan}
                  onClick={() => checkout.mutate(option.plan)}
                >
                  Subscribe
                </Button>
              </section>
            ))}
          </div>

          {checkout.isError && (
            <p role="alert" className="mt-4 text-body text-error">
              {getErrorMessage(checkout.error, "We couldn't start the checkout. Please try again.")}
            </p>
          )}

          <h2 className="mt-10 text-section font-semibold">Or buy scans</h2>
          <p className="mt-1 text-meta text-muted">One-off packs, no subscription. They never expire.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {PACKS.map((pack) => (
              <section key={pack.product} className="flex flex-col rounded-panel border border-hairline bg-base-200 p-5 shadow-sheen">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-body font-semibold">{pack.scans} scans</h3>
                  {pack.note && <span className="text-meta font-medium text-success">{pack.note}</span>}
                </div>
                <p className="mt-3 text-[1.5rem] font-semibold tabular-nums">{pack.price}</p>
                <Button
                  className="mt-4"
                  variant="outline"
                  size="lg"
                  block
                  isLoading={checkout.isPending && checkout.variables === pack.product}
                  onClick={() => checkout.mutate(pack.product)}
                >
                  Buy
                </Button>
              </section>
            ))}
          </div>

          <p className="mt-6 text-[0.75rem] text-faint">
            Renews automatically until you cancel; you keep Premium until the end of the period you paid for.
            Payments are handled by Stripe.
          </p>
        </>
      )}
    </PageShell>
  );
}
