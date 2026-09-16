import { createContext } from "react";
import type { AuthUser, RegisterRequest } from "@workspace/api-client-react";

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Deliberately its own module, separate from `auth-provider.tsx`.
 *
 * A module that exports both a component and a context becomes a Fast Refresh
 * boundary, and hot-swapping it re-runs `createContext` — so the mounted
 * provider keeps serving the *old* context object while `useAuth` reads the new
 * one, and every consumer throws "must be used within an <AuthProvider>".
 *
 * That is not hypothetical here: `auth-provider.tsx` imports the generated API
 * client, so running `pnpm --filter @workspace/api-spec run codegen` with the
 * dev server open invalidates this whole chain and lands exactly there.
 *
 * Splitting the two keeps the module free of components, which makes it
 * non-hot-swappable: editing it triggers a full reload instead of a swap.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);
