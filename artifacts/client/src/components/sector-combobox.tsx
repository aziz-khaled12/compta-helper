import { useMemo, useState, type ComponentPropsWithRef } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  SECTORS,
  SECTOR_GROUPS,
  findSector,
  sectorLabel,
  sectorDescription,
  sectorGroupLabel,
  SECTOR_LABEL_AR,
  SECTOR_DESCRIPTION_AR,
  normalizeText,
} from "@workspace/sectors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Sector picker for the company identity forms.
 *
 * This is a searchable combobox rather than a `Select` on purpose. Two reasons:
 *
 * 1. The audience is business owners, not accountants. The catalogue has ~45
 *    entries in 11 groups, so a flat dropdown is a long scroll, and a bare code
 *    would mean nothing to the person choosing. Each row therefore leads with
 *    the plain-French name, shows the one-line description beneath it, and
 *    carries the code as muted supporting text.
 * 2. The choice drives which legal alerts the company sees, so the field carries
 *    a hint saying so — otherwise it reads as bookkeeping trivia and gets
 *    answered carelessly.
 *
 * Search matches the label, the code *and* the catalogue's keywords, so a user
 * who types "logiciel" finds "Informatique & numérique" without knowing that
 * wording is what we called it.
 */
/**
 * Everything a `<button>` accepts except the three props this control owns, so
 * the component can sit inside `<FormControl>` — Radix's Slot hands the trigger
 * the `id`, `aria-describedby` and `ref` that associate it with `FormLabel` and
 * `FormMessage`, and those have to land on the focusable element, not a wrapper.
 */
export interface SectorComboboxProps
  extends Omit<
    ComponentPropsWithRef<"button">,
    "value" | "onChange" | "children" | "type" | "role"
  > {
  value: string | null | undefined;
  onChange: (code: string | null) => void;
}

/** Search string built from everything a user might type to find a sector. */
function searchValueFor(code: string): string {
  const sector = findSector(code);
  if (!sector) return normalizeText(code);
  return normalizeText(
    [
      sector.label,
      sector.description,
      SECTOR_LABEL_AR[code],
      SECTOR_DESCRIPTION_AR[code],
      sector.code,
      ...sector.keywords,
    ].join(" "),
  );
}

const SEARCH_VALUES: Record<string, string> = Object.fromEntries(
  SECTORS.map((s) => [s.code, searchValueFor(s.code)]),
);

export function SectorCombobox({
  value,
  onChange,
  disabled,
  className,
  ...triggerProps
}: SectorComboboxProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = findSector(value);

  // A code that is no longer in the catalogue is shown as-is rather than as an
  // empty field — the company has *something* recorded, and silently blanking it
  // would imply no sector is set and invite a careless overwrite.
  const triggerLabel = selected
    ? sectorLabel(selected, i18n.language)
    : value ?? "";

  const byGroup = useMemo(
    () =>
      SECTOR_GROUPS.map((group) => ({
        group,
        sectors: SECTORS.filter((s) => s.group === group),
      })).filter((g) => g.sectors.length > 0),
    [],
  );

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            {...triggerProps}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              !triggerLabel && "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">{triggerLabel || t("sector.choose")}</span>
            <span className="flex items-center gap-1 shrink-0 ml-2">
              {value && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={t("sector.remove")}
                  className="rounded-sm opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      e.preventDefault();
                      onChange(null);
                    }
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder={t("sector.search")} />
            <CommandList className="max-h-72">
              <CommandEmpty>{t("sector.empty")}</CommandEmpty>
              {byGroup.map(({ group, sectors }) => (
                <CommandGroup key={group} heading={sectorGroupLabel(group, i18n.language)}>
                  {sectors.map((sector) => (
                    <CommandItem
                      key={sector.code}
                      value={SEARCH_VALUES[sector.code] ?? sector.code}
                      // The list is pre-filtered by `value`, so cmdk must not
                      // re-score the *visible* text — it would disagree with the
                      // keyword matches that put the row here.
                      onSelect={() => {
                        onChange(sector.code === value ? null : sector.code);
                        setOpen(false);
                      }}
                      className="items-start gap-2 py-2"
                    >
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          value === sector.code ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex flex-col gap-0.5 min-w-0">
                        <span className="flex items-baseline gap-2">
                          <span className="font-medium">{sectorLabel(sector, i18n.language)}</span>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {sector.code}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground leading-snug">
                          {sectorDescription(sector, i18n.language)}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        {selected
          ? sectorDescription(selected, i18n.language)
          : t("sector.hint")}
      </p>
    </div>
  );
}
