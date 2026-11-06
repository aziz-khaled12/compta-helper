import type { ReactNode } from "react";
import { DirectionProvider as RadixDirectionProvider } from "@radix-ui/react-direction";
import { useTranslation } from "react-i18next";

/**
 * Radix keeps its own notion of direction for popper geometry and arrow-key
 * navigation, and it defaults to LTR even when `<html dir="rtl">`. Feeding it
 * the active language keeps Select / Popover / Dropdown / Tabs / Tooltip
 * anchored to the reading-direction side and their keyboard semantics correct
 * for Arabic.
 */
export function DirectionProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? i18n.language ?? "fr").toLowerCase();
  const dir = language.startsWith("ar") ? "rtl" : "ltr";

  return <RadixDirectionProvider dir={dir}>{children}</RadixDirectionProvider>;
}
