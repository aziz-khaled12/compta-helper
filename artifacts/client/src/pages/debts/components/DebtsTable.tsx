import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/money";
import { HandCoins, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DebtsState } from "../hooks/useDebtsState";

export function DebtsTable({
  state,
  debts,
}: {
  state: DebtsState;
  debts: DebtsState["debts"];
}) {
  const { t } = useTranslation();

  return (
    <Table>
      <TableHeader className="bg-muted/30">
        <TableRow>
          <TableHead>{t("debts.colPerson")}</TableHead>
          <TableHead>{t("debts.colDirection")}</TableHead>
          <TableHead className="text-right">{t("debts.colAmount")}</TableHead>
          <TableHead className="text-right">{t("debts.colPaid")}</TableHead>
          <TableHead className="text-right">{t("debts.colRest")}</TableHead>
          <TableHead>{t("debts.colDate")}</TableHead>
          <TableHead>{t("debts.colOrigin")}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {debts.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={8}
              className="h-32 text-center text-muted-foreground"
            >
              <HandCoins className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              {t("debts.empty")}
            </TableCell>
          </TableRow>
        ) : (
          debts.map((debt) => (
            <TableRow key={debt.id}>
              <TableCell>
                <div className="font-medium">{debt.personName}</div>
                {debt.note && (
                  <div className="text-xs text-muted-foreground">{debt.note}</div>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={debt.direction === "OWED_TO_ME" ? "default" : "secondary"}
                  className="w-fit text-[10px]"
                >
                  {debt.direction === "OWED_TO_ME"
                    ? t("debts.direction.owedToMe")
                    : t("debts.direction.iOwe")}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-sm">
                <Money value={debt.amount} />
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                <Money value={debt.paid} />
              </TableCell>
              <TableCell className="text-right font-semibold">
                {debt.rest > 0 ? (
                  <Money value={debt.rest} />
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    {t("debts.settled")}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm">{formatDate(debt.date)}</TableCell>
              <TableCell>
                <Badge
                  variant={debt.origin === "ONBOARDING" ? "secondary" : "outline"}
                  className="text-[10px]"
                >
                  {debt.origin === "ONBOARDING"
                    ? t("debts.oldBadge")
                    : t("debts.manualBadge")}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={debt.rest <= 0}
                    onClick={() => state.openDebtPayment(debt)}
                  >
                    {t("debts.actions.pay")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("debts.actions.delete")}
                    onClick={() => state.removeDebt(debt.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
