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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/money";
import { FileText, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DebtsState } from "../hooks/useDebtsState";

export function UnpaidInvoices({ state }: { state: DebtsState }) {
  const { t } = useTranslation();
  const { unpaidInvoices } = state;

  return (
    <Table>
      <TableHeader className="bg-muted/30">
        <TableRow>
          <TableHead>{t("debts.colDate")}</TableHead>
          <TableHead>{t("debts.colLabel")}</TableHead>
          <TableHead>{t("debts.colType")}</TableHead>
          <TableHead className="text-right">{t("debts.colTtc")}</TableHead>
          <TableHead className="text-right">{t("debts.colPaid")}</TableHead>
          <TableHead className="text-right">{t("debts.colRest")}</TableHead>
          <TableHead className="text-right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {unpaidInvoices.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={7}
              className="h-32 text-center text-muted-foreground"
            >
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              {t("debts.invoicesEmpty")}
            </TableCell>
          </TableRow>
        ) : (
          unpaidInvoices.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="text-sm">{formatDate(tx.date)}</TableCell>
              <TableCell>
                <div className="font-medium">{tx.label}</div>
                {tx.thirdParty && (
                  <div className="text-xs text-muted-foreground">
                    {tx.thirdParty}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px]">
                  {t(`consts.transaction.type.${tx.type}`)}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-sm">
                <Money value={tx.amountTtc} />
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                <Money value={tx.paid} />
              </TableCell>
              <TableCell className="text-right font-semibold">
                <Money value={tx.rest} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={t("debts.actions.pay")}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => state.openInvoicePayment(tx, "FULL")}
                    >
                      {t("debts.invoice.payFull")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => state.openInvoicePayment(tx, "PARTIAL")}
                    >
                      {t("debts.invoice.payPartial")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
