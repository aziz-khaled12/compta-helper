import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  useGetCompany,
  getGetCompanyQueryKey,
  useUpsertCompany,
  useListFunding,
  getListFundingQueryKey,
  useCreateFunding,
  useDeleteFunding,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import {
  fundingSchema,
  taxRegimeSchema,
  type FundingValues,
} from "@/lib/company";

export const companySchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  nif: z.string().min(1, "Le NIF est requis"),
  ai: z.string().min(1, "L'AI est requis"),
  address: z.string().optional(),
  legalForm: z.string().optional(),
  taxRegime: taxRegimeSchema.optional(),
  // Nullable as well as optional: the combobox clears the field to `null`, and
  // `null` is the value the API and the column both read as "no sector".
  sectorCode: z.string().nullable().optional(),
});

export type CompanyFormValues = z.infer<typeof companySchema>;
export type FundingFormValues = FundingValues;

export function useCompanyState() {
  const queryClient = useQueryClient();
  const [isFundingOpen, setIsFundingOpen] = useState(false);

  const { data: company, isLoading: loadingCompany } = useGetCompany();
  const { data: funding = [], isLoading: loadingFunding } = useListFunding();
  
  const upsertCompany = useUpsertCompany();
  const createFunding = useCreateFunding();
  const deleteFunding = useDeleteFunding();

  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      nif: "",
      ai: "",
      address: "",
      legalForm: undefined,
      taxRegime: undefined,
      sectorCode: null,
    },
  });

  const fundingForm = useForm<FundingFormValues>({
    resolver: zodResolver(fundingSchema),
    defaultValues: { source: "OWN_FUNDS", label: "", amount: 0, date: new Date().toISOString().split('T')[0] },
  });

  useEffect(() => {
    if (company) {
      console.log("company: ", company)
      companyForm.reset({
        name: company.name ?? "",
        nif: company.nif ?? "",
        ai: company.ai ?? "",
        address: company.address || "",
        legalForm: company.legalForm ?? undefined,
        taxRegime: company.taxRegime ?? undefined,
        // Only the code round-trips. The label the server returns is derived
        // from it, so re-submitting the server's own label would be redundant.
        sectorCode: company.sectorCode ?? null,
      });

      console.log("companyForm: ", companyForm.getValues())
    }
  }, [company, companyForm.reset]);

  const onSubmitCompany = (values: CompanyFormValues) => {
    upsertCompany.mutate({ data: values }, {
      onSuccess: () => {
        toast.success("Profil entreprise mis à jour");
        queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey() });
      },
      onError: () => toast.error("Erreur lors de la mise à jour"),
    });
  };

  const onSubmitFunding = (values: FundingFormValues) => {
    createFunding.mutate({ data: values }, {
      onSuccess: () => {
        toast.success("Fonds ajoutés avec succès");
        setIsFundingOpen(false);
        fundingForm.reset();
        queryClient.invalidateQueries({ queryKey: getListFundingQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: () => toast.error("Erreur lors de l'ajout des fonds"),
    });
  };

  const handleDeleteFunding = (id: string) => {
    if (confirm("Supprimer cette entrée de capital ?")) {
      deleteFunding.mutate({ id }, {
        onSuccess: () => {
          toast.success("Entrée supprimée");
          queryClient.invalidateQueries({ queryKey: getListFundingQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        }
      });
    }
  };

  const ownFunds = funding.filter(f => f.source === "OWN_FUNDS").reduce((acc, curr) => acc + curr.amount, 0);
  const loans = funding.filter(f => f.source === "BANK_LOAN").reduce((acc, curr) => acc + curr.amount, 0);

  return {
    company,
    funding,
    loadingCompany,
    loadingFunding,
    companyForm,
    fundingForm,
    isFundingOpen,
    setIsFundingOpen,
    onSubmitCompany,
    onSubmitFunding,
    handleDeleteFunding,
    ownFunds,
    loans,
    upsertCompany,
    createFunding,
  };
}
