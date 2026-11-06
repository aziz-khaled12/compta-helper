import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input types that hold a machine-readable token rather than prose: a decimal,
 * a date, an address. Those always read left-to-right, so inheriting the Arabic
 * page's `dir="rtl"` would reorder their digits and punctuation. Free-text
 * inputs keep the inherited direction so Arabic typing stays natural.
 */
const LTR_INPUT_TYPES = new Set([
  "date",
  "datetime-local",
  "email",
  "month",
  "number",
  "password",
  "tel",
  "time",
  "url",
])

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, dir, ...props }, ref) => {
    const isToken = type !== undefined && LTR_INPUT_TYPES.has(type)
    return (
      <input
        type={type}
        dir={dir ?? (isToken ? "ltr" : undefined)}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          // `dir="ltr"` would otherwise park these fields on the left edge of an
          // RTL form; keep them flush with the inline start like the other fields.
          isToken && "rtl:text-right",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
