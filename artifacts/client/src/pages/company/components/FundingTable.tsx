import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatMoney, formatDate } from "@/lib/format";
import { useCompanyState } from "../hooks/useCompanyState";

export function FundingTable({ state }: { state: ReturnType<typeof useCompanyState> }) {
  const { t } = useTranslation();
  const { funding, handleDeleteFunding } = state;
  if (funding.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
        {t("companyPage.fundingEmpty")}
      </div>
    );
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("companyPage.fundingColDate")}</TableHead>
            <TableHead>{t("companyPage.fundingColType")}</TableHead>
            <TableHead className="text-right">{t("companyPage.fundingColAmount")}</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {funding.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-sm">{formatDate(item.date)}</TableCell>
              <TableCell>
                <div>
                  <span className="font-medium text-sm">
                    {item.source === "OWN_FUNDS" ? t("companyPage.fundingOwnShort") : t("companyPage.fundingLoanShort")}
                  </span>
                  {item.label && <div className="text-xs text-muted-foreground">{item.label}</div>}
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">{formatMoney(item.amount)}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteFunding(item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
