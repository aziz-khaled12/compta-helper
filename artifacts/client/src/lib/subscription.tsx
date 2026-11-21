import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  canUseService,
  type AnyServiceId,
  type PlanId,
} from "./plans";
import {
  PASS_CHANGE_EVENT,
  daysLeft as passDaysLeft,
  isAccessPassActive,
  readAccessPass,
  type AccessPass,
} from "./access-pass";

type SubscriptionContextValue = {
  /** The raw pass, active or not — the renewal screen needs it too. */
  pass: AccessPass | null;
  /** Plan currently in force, `null` without a pass. */
  plan: PlanId | null;
  isActive: boolean;
  isTrial: boolean;
  /** Whole days until `expiresAt`, 0 without a pass. */
  daysLeft: number;
  /** Grants one service, core or add-on. Always `false` when expired. */
  canUse: (service: AnyServiceId) => boolean;
  refresh: () => void;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

/**
 * Reads the localStorage pass once and keeps it in sync with every write:
 * `saveAccessPass`/`clearAccessPass` dispatch a same-tab event, other tabs
 * arrive through `storage`, and a one-minute tick re-evaluates the expiry so
 * an open tab cannot outlive its trial.
 */
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [pass, setPass] = useState<AccessPass | null>(() => readAccessPass());

  const refresh = useCallback(() => setPass(readAccessPass()), []);

  useEffect(() => {
    const onChange = () => refresh();

    window.addEventListener(PASS_CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    const timer = window.setInterval(refresh, 60_000);

    return () => {
      window.removeEventListener(PASS_CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const value = useMemo<SubscriptionContextValue>(() => {
    const active = isAccessPassActive(pass) ? pass : null;

    return {
      pass,
      plan: active?.plan ?? null,
      isActive: active !== null,
      isTrial: active?.trial === true,
      daysLeft: pass ? passDaysLeft(pass) : 0,
      canUse: (service) =>
        active !== null && canUseService(active.plan, active.services, service),
      refresh,
    };
  }, [pass, refresh]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used inside <SubscriptionProvider>");
  }
  return context;
}
