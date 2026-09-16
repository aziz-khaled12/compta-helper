import { format, formatDistanceToNow, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export function formatMoney(amount: number | undefined | null): string {
  if (amount == null) return "0,00 DA";
  return new Intl.NumberFormat("fr-DZ", {
    style: "currency",
    currency: "DZD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date | undefined | null, dateFormat = "dd MMM yyyy"): string {
  if (!date) return "-";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, dateFormat, { locale: fr });
}

export function formatRelative(date: string | Date | undefined | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { locale: fr, addSuffix: true });
}
