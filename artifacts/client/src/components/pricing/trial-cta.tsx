import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  hasUsedTrial,
  isAccessPassActive,
  readAccessPass,
  startTrial,
} from "@/lib/access-pass";
import { TRIAL_DAYS } from "@/lib/plans";

type TrialState = "available" | "active" | "used";

/**
 * The one free week of the full pack, offered before any commitment.
 *
 * The button writes the trial pass and drops the visitor on registration —
 * exactly the same gate a paid pass opens, so a trialist sees the real app.
 * The availability is read once on mount: it only changes through this button
 * or a payment, both of which navigate away.
 */
export function TrialCta({
  appearance = "button",
  className,
}: {
  appearance?: "button" | "link";
  className?: string;
}) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [state] = useState<TrialState>(() => {
    if (isAccessPassActive(readAccessPass())) return "active";
    return hasUsedTrial() ? "used" : "available";
  });

  if (state === "active") {
    return (
      <p className={"text-xs text-[#53627a] " + (className ?? "")}>
        {t("checkout.alreadyActive")}{" "}
        <Link href="/login" className="font-semibold text-[#087fbb] underline-offset-2 hover:underline">
          {t("checkout.useIt")}
        </Link>
      </p>
    );
  }

  if (state === "used") {
    return (
      <p className={"text-xs text-[#8a9caf] " + (className ?? "")}>
        {t("trial.used")}
      </p>
    );
  }

  const begin = () => {
    startTrial();
    navigate("/login?register=true");
  };

  if (appearance === "link") {
    return (
      <button
        type="button"
        onClick={begin}
        className={
          "inline-flex items-center gap-1.5 text-sm font-semibold text-[#087fbb] transition-colors hover:text-[#066c9f] " +
          (className ?? "")
        }>
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {t("trial.cta")}
      </button>
    );
  }

  return (
    <Button
      type="button"
      onClick={begin}
      className={
        "h-11 shrink-0 rounded-md bg-[#14284f] px-5 text-sm text-white shadow-none hover:bg-[#0d1c38] " +
        (className ?? "")
      }>
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      {t("trial.cta")}
    </Button>
  );
}

/** Banner used on the landing page and `/pricing`, above the plan cards. */
export function TrialBand() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto mb-10 flex max-w-[820px] flex-col items-center gap-4 rounded-2xl border border-[#cbeaf8] bg-[#f2fbff] px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-start">
      <div>
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-[#14284f] sm:justify-start">
          <Sparkles className="h-4 w-4 text-[#087fbb]" aria-hidden="true" />
          {t("trial.bandTitle")}
        </p>
        <p className="mt-1 text-xs text-[#687a91]">
          {t("trial.note", { days: TRIAL_DAYS })}
        </p>
      </div>
      <TrialCta />
    </div>
  );
}
