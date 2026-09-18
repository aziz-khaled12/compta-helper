import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { monthLabel } from "@/lib/months";
import type { MonthSeries } from "@/lib/analytics/metrics";
import { useTranslation } from "react-i18next";

/**
 * Whether a period holds anything worth drawing.
 *
 * Exported so the page can show its "pas encore de données sur cette période"
 * line under the same condition that suppresses the chart below — one
 * definition rather than two that can drift apart.
 *
 * It asks about *activity*, not about `months.length`. `buildMonthSeries` emits
 * a row for every month the period touches, so a company with an empty period
 * gets a month or two of zeroes rather than no rows at all, and a chart of
 * nothing but zero-height bars reads as a broken screen. The audience here is a
 * business owner, not an accountant; an absent chart with a sentence explaining
 * why reads as a fact, whereas an empty frame reads as a bug.
 */
export function hasTrendData(months: MonthSeries[]): boolean {
  return months.some(
    (m) => m.revenueHt !== 0 || m.cogs !== 0 || m.purchasesHt !== 0 || m.expensesHt !== 0,
  );
}

interface TrendPoint {
  monthYear: string;
  revenueHt: number;
  /** `null` in a month with no sales — recharts breaks the line there, which is correct. */
  marginPct: number | null;
}

/**
 * Monthly revenue as bars, gross margin as a line on a second axis.
 *
 * Two axes because the two things do not share a unit: dinars on the left,
 * percent on the right. Plotting the margin against the revenue axis would draw
 * a flat line pinned to the bottom of the frame whatever the margin actually is.
 *
 * The margin line is the whole point of putting them together — a month where
 * the bars grow but the line sags is the thing an owner needs to see, and it is
 * invisible in either series read alone.
 */
export function TrendChart({ months }: { months: MonthSeries[] }) {
  const { t } = useTranslation();
  const REVENUE = t("analyse.trend.revenue");
  const MARGIN = t("analyse.trend.margin");
  if (!hasTrendData(months)) return null;

  const data: TrendPoint[] = months.map((m) => ({
    monthYear: m.monthYear,
    revenueHt: m.revenueHt,
    // Stored as a fraction; shown as the percentage the user thinks in.
    marginPct: m.grossMarginPct === null ? null : m.grossMarginPct * 100,
  }));

  // "Mars 2026" is too wide to repeat a dozen times along an axis, so a long
  // period drops the year and abbreviates. Short ranges keep the full label
  // because there, the year is the only thing distinguishing two Januaries.
  const long = data.length > 6;
  const tick = (monthYear: string) => {
    const full = monthLabel(monthYear);
    return long ? full.split(" ")[0]!.slice(0, 4) : full;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("analyse.trend.title")}</CardTitle>
        <CardDescription>{t("analyse.trend.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="monthYear"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={tick}
                dy={10}
              />
              <YAxis
                yAxisId="money"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                dx={-10}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
                dx={10}
              />
              <Tooltip
                labelFormatter={(label) => monthLabel(String(label))}
                formatter={(value, name) =>
                  name === MARGIN
                    ? [`${Number(value).toFixed(1)} %`, name]
                    : [formatMoney(Number(value)), name]
                }
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Bar
                yAxisId="money"
                dataKey="revenueHt"
                name={REVENUE}
                fill="hsl(var(--primary))"
                fillOpacity={0.85}
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="marginPct"
                name={MARGIN}
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
                // A month with no sales has no margin; the line stops there
                // rather than diving to zero, which would draw a collapse that
                // did not happen.
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
