import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatMoney } from "@/lib/format";
import { Link } from "wouter";
import { useDashboardState } from "../hooks/useDashboardState";

export function RecentActivity({ state }: { state: ReturnType<typeof useDashboardState> }) {
  const { t } = useTranslation();
  const { activity } = state;
  return (
    <Card className="col-span-3">
      <CardHeader><CardTitle>{t("dashboard.activity.title")}</CardTitle><CardDescription>{t("dashboard.activity.subtitle")}</CardDescription></CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activity?.slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${item.type === 'SALE' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {item.type === 'SALE' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.thirdParty || t("dashboard.activity.misc")}</p>
                </div>
              </div>
              <div className={`text-sm font-semibold ${item.type === 'SALE' ? 'text-emerald-600' : 'text-foreground'}`}>
                {item.type === 'SALE' ? '+' : '-'}{formatMoney(item.amountTtc)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t"><Link href="/journal"><Button variant="outline" className="w-full">{t("dashboard.activity.viewAll")}</Button></Link></div>
      </CardContent>
    </Card>
  );
}
