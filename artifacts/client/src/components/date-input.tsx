import * as React from "react"
import { CalendarDays } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const ISO_MONTH_RE = /^(\d{4})-(\d{2})$/

/**
 * Arabic-Indic (٠-٩) and Persian (۰-۹) digits are folded to ASCII, so a user may
 * type either on an Arabic keyboard and still produce a valid date.
 */
function toAsciiDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
}

/** `2026-11-18` -> `18/11/2026` (the app-wide display format). */
export function isoDateToDisplay(iso?: string | null): string {
  const match = iso ? ISO_DATE_RE.exec(iso) : null
  if (!match) return ""
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/** `2026-11` -> `11/2026`. */
export function isoMonthToDisplay(iso?: string | null): string {
  const match = iso ? ISO_MONTH_RE.exec(iso) : null
  if (!match) return ""
  const [, year, month] = match
  return `${month}/${year}`
}

/** `18112026` -> `2026-11-18`, or null when the day/month pair is not real. */
function digitsToIsoDate(digits: string): string | null {
  if (digits.length !== 8) return null
  const day = Number(digits.slice(0, 2))
  const month = Number(digits.slice(2, 4))
  const year = Number(digits.slice(4, 8))
  if (year < 1000 || month < 1 || month > 12 || day < 1) return null
  // Date.UTC rolls impossible days over (31/02 -> 03/03), so compare it back.
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`
}

/** `112026` -> `2026-11`. */
function digitsToIsoMonth(digits: string): string | null {
  if (digits.length !== 6) return null
  const month = Number(digits.slice(0, 2))
  const year = Number(digits.slice(2, 6))
  if (year < 1000 || month < 1 || month > 12) return null
  return `${digits.slice(2, 6)}-${digits.slice(0, 2)}`
}

function maskDate(raw: string): string {
  const digits = toAsciiDigits(raw).replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function maskMonth(raw: string): string {
  const digits = toAsciiDigits(raw).replace(/\D/g, "").slice(0, 6)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

type NativeInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "defaultValue" | "onChange"
>

export interface DateInputProps extends NativeInputProps {
  /** ISO value, exactly like a native date input: `yyyy-mm-dd` (or `yyyy-mm` in month mode). */
  value?: string | null
  /** Receives the ISO value, or `""` when the field is cleared/invalid. */
  onChange?: (value: string) => void
  mode?: "date" | "month"
}

/**
 * Drop-in replacement for `<Input type="date" />` / `type="month"`.
 *
 * The native control renders whatever format the browser locale dictates and
 * ignores `dir` (Chrome pins it LTR), which left Arabic users with a
 * left-aligned `mm/dd/yyyy` field. This one always shows `dd/mm/yyyy`
 * (`mm/yyyy` for months) and follows the active language direction: RTL in
 * Arabic, LTR in French. Typing is masked and the calendar opens in the
 * browser's own picker through a visually hidden native input.
 *
 * The value contract stays ISO so the API payloads, react-hook-form schemas and
 * initial values need no change.
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  function DateInput(
    { value, onChange, onBlur, mode = "date", className, placeholder, ...props },
    ref
  ) {
    const { t, i18n } = useTranslation()
    const isRtl = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith("ar")
    const isMonth = mode === "month"
    const toDisplay = isMonth ? isoMonthToDisplay : isoDateToDisplay

    const [text, setText] = React.useState(() => toDisplay(value))
    // Set whenever we push a value upwards; it tells the sync effect that the
    // incoming `value` is our own echo and must not overwrite in-progress text.
    const lastEmitted = React.useRef<string | null>(null)
    const pickerRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
      if (value === lastEmitted.current) return
      lastEmitted.current = null
      setText(isMonth ? isoMonthToDisplay(value) : isoDateToDisplay(value))
    }, [value, isMonth])

    const emit = (iso: string) => {
      lastEmitted.current = iso
      onChange?.(iso)
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value.trim()
      // Pasting an ISO date (`2026-11-18`) is respected instead of being cut to
      // eight digits and read backwards.
      const pastedIso = isMonth ? ISO_MONTH_RE.exec(raw) : ISO_DATE_RE.exec(raw)
      if (pastedIso) {
        setText(toDisplay(raw))
        emit(raw)
        return
      }

      const masked = isMonth ? maskMonth(raw) : maskDate(raw)
      setText(masked)
      const digits = masked.replace(/\D/g, "")
      const complete = digits.length === (isMonth ? 6 : 8)
      if (digits.length === 0) {
        emit("")
      } else if (complete) {
        emit((isMonth ? digitsToIsoMonth(digits) : digitsToIsoDate(digits)) ?? "")
      }
    }

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      const digits = text.replace(/\D/g, "")
      const iso = isMonth ? digitsToIsoMonth(digits) : digitsToIsoDate(digits)
      // Half-typed or impossible dates snap back to the value the form holds,
      // so the visible text never disagrees with what will be submitted.
      if (!iso) setText(toDisplay(value))
      onBlur?.(event)
    }

    const openPicker = () => {
      const picker = pickerRef.current as
        | (HTMLInputElement & { showPicker?: () => void })
        | null
      if (!picker) return
      if (typeof picker.showPicker === "function") {
        try {
          picker.showPicker()
          return
        } catch {
          // Older browsers can refuse; fall back to a synthetic click.
        }
      }
      picker.focus()
      picker.click()
    }

    const pickerValue = value ?? ""
    const isValidIso = (isMonth ? ISO_MONTH_RE : ISO_DATE_RE).test(pickerValue)

    return (
      <div className="relative" dir={isRtl ? "rtl" : "ltr"}>
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          dir={isRtl ? "rtl" : "ltr"}
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={
            placeholder ?? t(isMonth ? "common.monthPlaceholder" : "common.datePlaceholder")
          }
          className={cn("pe-9", className)}
        />
        <button
          type="button"
          onClick={openPicker}
          aria-label={t("common.datePick")}
          className="absolute inset-y-0 end-0 flex w-9 items-center justify-center rounded-e-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          ref={pickerRef}
          type={isMonth ? "month" : "date"}
          tabIndex={-1}
          aria-hidden="true"
          value={isValidIso ? pickerValue : ""}
          onChange={(event) => {
            const iso = event.target.value
            if (!iso) return
            setText(isMonth ? isoMonthToDisplay(iso) : isoDateToDisplay(iso))
            emit(iso)
          }}
          className="pointer-events-none absolute inset-y-0 end-0 h-9 w-9 opacity-0"
        />
      </div>
    )
  }
)
DateInput.displayName = "DateInput"
