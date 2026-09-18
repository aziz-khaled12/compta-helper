import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n";
import {
  useUpsertCompany,
  useCreateFunding,
  useCreateAsset,
  useCreateInventoryItem,
  useCreateInventoryMovement,
  useCreateEmployee,
  getGetCompanyQueryKey,
  getListFundingQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import {
  DRAFT_STORAGE_KEY,
  DRAFT_VERSION,
  onboardingDraftSchema,
  type AssetData,
  type EmployeeData,
  type FundingData,
  type InventoryData,
  type OnboardingDraft,
  type OnboardingPhase,
  type Step1Data,
} from "../types";

export const TOTAL_STEPS = 4;

/** Long enough to skip most keystrokes, short enough to survive a reflex F5. */
const SAVE_DEBOUNCE_MS = 400;

function emptyDraft(): OnboardingDraft {
  return {
    version: DRAFT_VERSION,
    step: 1,
    company: null,
    funding: [],
    assets: [],
    inventory: [],
    employees: [],
    completedPhases: [],
  };
}

/**
 * A draft from an older shape (or a corrupted entry) is discarded rather than
 * migrated — the wizard is short enough that a silent restart beats showing the
 * user a parse error they cannot act on.
 */
function loadDraft(): OnboardingDraft {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return emptyDraft();
    const parsed = onboardingDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyDraft();
  } catch {
    return emptyDraft();
  }
}

/** Persistence is a convenience, not a requirement — never fail the wizard over it. */
function writeDraft(draft: OnboardingDraft): void {
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Private-mode / quota. Nothing to recover from.
  }
}

function removeDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Same as above.
  }
}

export function useOnboardingState() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<OnboardingDraft>(loadDraft);
  const [submitting, setSubmitting] = useState(false);

  const upsertCompany = useUpsertCompany();
  const createFunding = useCreateFunding();
  const createAsset = useCreateAsset();
  const createItem = useCreateInventoryItem();
  const createMovement = useCreateInventoryMovement();
  const createEmployee = useCreateEmployee();

  // Debounced so a field being typed into does not write on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => writeDraft(draft), SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const patch = useCallback((partial: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const goToStep = useCallback(
    (step: number) => patch({ step: Math.min(Math.max(step, 1), TOTAL_STEPS) }),
    [patch],
  );
  const nextStep = useCallback(
    () => setDraft((prev) => ({ ...prev, step: Math.min(prev.step + 1, TOTAL_STEPS) })),
    [],
  );
  const backStep = useCallback(
    () => setDraft((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1) })),
    [],
  );

  const setCompany = useCallback(
    (company: Step1Data | null) => patch({ company }),
    [patch],
  );
  const setFunding = useCallback(
    (funding: FundingData[]) => patch({ funding }),
    [patch],
  );
  const setAssets = useCallback((assets: AssetData[]) => patch({ assets }), [patch]);
  const setInventory = useCallback(
    (inventory: InventoryData[]) => patch({ inventory }),
    [patch],
  );
  const setEmployees = useCallback(
    (employees: EmployeeData[]) => patch({ employees }),
    [patch],
  );

  /**
   * `overrides` lets the last step hand over a row that is still sitting in its
   * form — on the final step there is no going back, so anything the user typed
   * must be committed rather than dropped.
   */
  const handleFinish = useCallback(async (overrides?: { employees?: EmployeeData[] }) => {
    const company = draft.company;
    if (!company) return;

    const employees = overrides?.employees ?? draft.employees;

    const done = new Set<OnboardingPhase>(draft.completedPhases);
    const markDone = (phase: OnboardingPhase) => {
      done.add(phase);
      patch({ completedPhases: [...done] });
    };

    const today = new Date().toISOString().slice(0, 10);
    setSubmitting(true);

    let phaseLabel = i18n.t("onboarding.phase.company");
    try {
      // The company must exist before anything else: every other route resolves
      // its tenant through it, and there is nothing to attach to until it is saved.
      if (!done.has("company")) {
        const saved = await upsertCompany.mutateAsync({
          data: {
            name: company.name,
            nif: company.nif,
            ai: company.ai,
            address: company.address || null,
            legalForm: company.legalForm ?? null,
            // The system decides which fiscal return the reports page offers,
            // so leaving it behind here would silently downgrade a company the
            // user just declared as forfaitaire to the legal-form fallback.
            taxRegime: company.taxRegime ?? null,
            // Carried through the wizard for the same reason as the régime: the
            // crawler matches decrees against it, and a company that reaches the
            // dashboard without one silently receives no sector-specific alerts.
            sectorCode: company.sectorCode ?? null,
          },
        });
        // Seeding the cache flips App.tsx's gate on this render rather than
        // waiting on a round trip, so finishing the wizard always lands on the
        // dashboard. The invalidate at the end still reconciles it with the
        // server. (A resumed run skips this — the invalidate covers it.)
        queryClient.setQueryData(getGetCompanyQueryKey(), saved);
        markDone("company");
      }

      if (!done.has("funding")) {
        phaseLabel = i18n.t("onboarding.phase.funding");
        for (const entry of draft.funding) {
          const isLoan = entry.source === "BANK_LOAN";
          await createFunding.mutateAsync({
            data: {
              source: entry.source,
              label: entry.label || null,
              amount: entry.amount,
              date: entry.date,
              // Only a loan carries these; sending them for own funds would
              // invent a repayment schedule that does not exist.
              interestRate: isLoan ? (entry.interestRate ?? null) : null,
              durationMonths: isLoan ? (entry.durationMonths ?? null) : null,
            },
          });
        }
        markDone("funding");
      }

      if (!done.has("assets")) {
        phaseLabel = i18n.t("onboarding.phase.assets");
        for (const asset of draft.assets) {
          await createAsset.mutateAsync({
            data: {
              label: asset.label,
              category: asset.category,
              costHt: asset.costHt,
              purchaseDate: asset.purchaseDate,
              lifeYears: asset.lifeYears,
              residualValue: asset.residualValue,
            },
          });
        }
        markDone("assets");
      }

      if (!done.has("inventory")) {
        phaseLabel = i18n.t("onboarding.phase.inventory");
        for (const item of draft.inventory) {
          const created = await createItem.mutateAsync({
            data: { name: item.name, category: item.category, unit: item.unit },
          });
          // An item with no movement has no quantity and no cost, so the opening
          // quantity is booked as an IN movement rather than stored on the item.
          await createMovement.mutateAsync({
            data: {
              itemId: created.id,
              date: today,
              quantity: item.initialQty,
              direction: "IN",
              unitCostHt: item.unitCostHt,
              note: i18n.t("onboarding.stockInitialNote"),
            },
          });
        }
        markDone("inventory");
      }

      if (!done.has("employees")) {
        phaseLabel = i18n.t("onboarding.phase.employees");
        for (const employee of employees) {
          await createEmployee.mutateAsync({
            data: {
              fullName: employee.fullName,
              position: employee.position,
              familySituation: employee.familySituation,
              baseSalary: employee.baseSalary,
              experienceYears: employee.experienceYears,
              hireDate: employee.hireDate,
            },
          });
        }
        markDone("employees");
      }

      // Invalidate rather than navigate: App.tsx gates on useGetCompany, so this
      // flips the tree into <Layout> without a full reload (and without the
      // BASE_PATH-relative href that broke production).
      await queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getListFundingQueryKey() });
      void queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
      });

      // Only once the app is provably past this wizard. Dropping the draft
      // earlier would strand anyone whose final refetch failed on a screen that
      // can no longer resume, and re-running it would duplicate everything the
      // phase ledger had already saved.
      removeDraft();

      toast.success(i18n.t("onboarding.toast.done"), {
        description: i18n.t("onboarding.toast.doneDesc"),
      });
    } catch {
      // The draft — and the phase ledger it carries — survives, so retrying
      // resumes instead of duplicating everything that already saved.
      toast.error(i18n.t("onboarding.toast.error", { phase: phaseLabel }), {
        description: i18n.t("onboarding.toast.errorDesc"),
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    draft,
    patch,
    queryClient,
    upsertCompany,
    createFunding,
    createAsset,
    createItem,
    createMovement,
    createEmployee,
  ]);

  return {
    step: draft.step,
    goToStep,
    nextStep,
    backStep,
    company: draft.company,
    funding: draft.funding,
    assets: draft.assets,
    inventory: draft.inventory,
    employees: draft.employees,
    setCompany,
    setFunding,
    setAssets,
    setInventory,
    setEmployees,
    submitting,
    handleFinish,
  };
}

export type OnboardingState = ReturnType<typeof useOnboardingState>;
