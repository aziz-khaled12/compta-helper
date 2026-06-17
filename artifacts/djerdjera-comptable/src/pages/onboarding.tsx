import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useUpsertCompany,
  useCreateAsset,
  useCreateInventoryItem,
  useCreateInventoryMovement,
  useCreateEmployee,
  useGetCompany,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Building2, Briefcase, Package, Users, ChevronRight, ChevronLeft, Plus, Trash2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(2, "Nom requis"),
  nif: z.string().min(3, "NIF requis"),
  ai: z.string().min(3, "AI requis"),
  address: z.string().optional(),
  legalForm: z.enum(["EURL", "SARL", "SPA", "SNCE", "EI"]).optional(),
});

const assetSchema = z.object({
  label: z.string().min(2),
  category: z.string().min(1),
  costHt: z.coerce.number().positive(),
  purchaseDate: z.string().min(10),
  lifeYears: z.coerce.number().int().positive(),
  residualValue: z.coerce.number().min(0),
});

const inventorySchema = z.object({
  name: z.string().min(2),
  category: z.enum(["RAW_MATERIAL", "FINISHED_GOOD", "SUPPLY"]),
  unit: z.string().min(1),
  initialQty: z.coerce.number().positive(),
  unitCostHt: z.coerce.number().positive(),
});

const employeeSchema = z.object({
  fullName: z.string().min(2),
  position: z.string().min(2),
  familySituation: z.enum(["SINGLE", "MARRIED", "MARRIED_1", "MARRIED_2", "MARRIED_3", "MARRIED_4"]),
  baseSalary: z.coerce.number().positive(),
  experienceYears: z.coerce.number().int().min(0),
  hireDate: z.string().min(10),
});

type Step1Data = z.infer<typeof step1Schema>;
type AssetData = z.infer<typeof assetSchema>;
type InventoryData = z.infer<typeof inventorySchema>;
type EmployeeData = z.infer<typeof employeeSchema>;

// ─── Step progress ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Identité", icon: Building2 },
  { id: 2, label: "Immobilisations", icon: Briefcase },
  { id: 3, label: "Stocks", icon: Package },
  { id: 4, label: "Personnel", icon: Users },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = current > step.id;
          const active = current === step.id;
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    done
                      ? "bg-primary border-primary text-primary-foreground"
                      : active
                      ? "border-primary text-primary bg-primary/10"
                      : "border-muted text-muted-foreground"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 ${done ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>
      <Progress value={(current / STEPS.length) * 100} className="h-1.5" />
      <p className="text-xs text-muted-foreground mt-1 text-right">
        Étape {current} sur {STEPS.length}
      </p>
    </div>
  );
}

// ─── Step 1: Company identity ─────────────────────────────────────────────────

function Step1Company({ onNext }: { onNext: (data: Step1Data) => void }) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
  });
  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 space-y-1.5">
          <Label>Raison Sociale *</Label>
          <Input {...register("name")} placeholder="ex. EURL DJERDJERA" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>NIF (Numéro d'Identification Fiscale) *</Label>
          <Input {...register("nif")} placeholder="000000000000000" />
          {errors.nif && <p className="text-xs text-destructive">{errors.nif.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>AI (Numéro d'Article d'Imposition) *</Label>
          <Input {...register("ai")} placeholder="00000000" />
          {errors.ai && <p className="text-xs text-destructive">{errors.ai.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Forme Juridique</Label>
          <Select onValueChange={(v) => setValue("legalForm", v as Step1Data["legalForm"])}>
            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
            <SelectContent>
              {["EURL", "SARL", "SPA", "SNCE", "EI"].map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Adresse</Label>
          <Input {...register("address")} placeholder="Wilaya, commune..." />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" className="gap-2">
          Suivant <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

// ─── Step 2: Fixed Assets ─────────────────────────────────────────────────────

function Step2Assets({ onNext, onBack }: { onNext: (data: AssetData[]) => void; onBack: () => void }) {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AssetData>({
    resolver: zodResolver(assetSchema),
    defaultValues: { lifeYears: 5, residualValue: 0, purchaseDate: new Date().toISOString().slice(0, 10) },
  });

  function addAsset(data: AssetData) {
    setAssets((prev) => [...prev, data]);
    reset({ lifeYears: 5, residualValue: 0, purchaseDate: new Date().toISOString().slice(0, 10) });
  }

  return (
    <div className="space-y-6">
      {assets.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{assets.length} immobilisation(s) ajoutée(s)</p>
          {assets.map((a, i) => (
            <div key={i} className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/30">
              <div>
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.category} — {a.costHt.toLocaleString("fr-DZ")} DA HT</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setAssets((p) => p.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(addAsset)} className="space-y-4 border rounded-xl p-4 bg-muted/10">
        <p className="text-sm font-semibold">Ajouter une immobilisation</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Désignation *</Label>
            <Input {...register("label")} placeholder="ex. Véhicule utilitaire" />
            {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Catégorie *</Label>
            <Input {...register("category")} placeholder="ex. Matériel roulant" />
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Valeur d'acquisition HT (DA) *</Label>
            <Input {...register("costHt")} type="number" placeholder="1000000" />
            {errors.costHt && <p className="text-xs text-destructive">{errors.costHt.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Date d'acquisition *</Label>
            <Input {...register("purchaseDate")} type="date" />
          </div>
          <div className="space-y-1.5">
            <Label>Durée de vie (années) *</Label>
            <Input {...register("lifeYears")} type="number" min="1" />
          </div>
          <div className="space-y-1.5">
            <Label>Valeur résiduelle (DA)</Label>
            <Input {...register("residualValue")} type="number" min="0" />
          </div>
        </div>
        <Button type="submit" variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </form>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Button>
        <Button onClick={() => onNext(assets)} className="gap-2">
          Suivant <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Inventory ────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  RAW_MATERIAL: "Matière première",
  FINISHED_GOOD: "Produit fini",
  SUPPLY: "Fourniture",
};

function Step3Inventory({ onNext, onBack }: { onNext: (data: InventoryData[]) => void; onBack: () => void }) {
  const [items, setItems] = useState<InventoryData[]>([]);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<InventoryData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: { category: "RAW_MATERIAL", unit: "pièce" },
  });

  function addItem(data: InventoryData) {
    setItems((prev) => [...prev, data]);
    reset({ category: "RAW_MATERIAL", unit: "pièce" });
  }

  return (
    <div className="space-y-6">
      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{items.length} article(s) ajouté(s)</p>
          {items.map((a, i) => (
            <div key={i} className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/30">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  {CATEGORY_LABELS[a.category]} — {a.initialQty} {a.unit} @ {a.unitCostHt.toLocaleString("fr-DZ")} DA/u
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setItems((p) => p.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(addItem)} className="space-y-4 border rounded-xl p-4 bg-muted/10">
        <p className="text-sm font-semibold">Ajouter un article de stock</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Désignation *</Label>
            <Input {...register("name")} placeholder="ex. Farine T45" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Catégorie *</Label>
            <Select onValueChange={(v) => setValue("category", v as InventoryData["category"])} defaultValue="RAW_MATERIAL">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Unité *</Label>
            <Input {...register("unit")} placeholder="pièce / kg / L..." />
          </div>
          <div className="space-y-1.5">
            <Label>Quantité initiale *</Label>
            <Input {...register("initialQty")} type="number" min="1" placeholder="50" />
            {errors.initialQty && <p className="text-xs text-destructive">{errors.initialQty.message}</p>}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Coût unitaire HT (DA) *</Label>
            <Input {...register("unitCostHt")} type="number" placeholder="500" />
            {errors.unitCostHt && <p className="text-xs text-destructive">{errors.unitCostHt.message}</p>}
          </div>
        </div>
        <Button type="submit" variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </form>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Button>
        <Button onClick={() => onNext(items)} className="gap-2">
          Suivant <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 4: Personnel ────────────────────────────────────────────────────────

const FAMILY_LABELS: Record<string, string> = {
  SINGLE: "Célibataire",
  MARRIED: "Marié(e) sans enfant",
  MARRIED_1: "Marié(e) + 1 enfant",
  MARRIED_2: "Marié(e) + 2 enfants",
  MARRIED_3: "Marié(e) + 3 enfants",
  MARRIED_4: "Marié(e) + 4 enfants et plus",
};

function Step4Personnel({
  onFinish,
  onBack,
  submitting,
}: {
  onFinish: (data: EmployeeData[]) => void;
  onBack: () => void;
  submitting: boolean;
}) {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<EmployeeData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      familySituation: "SINGLE",
      experienceYears: 0,
      hireDate: new Date().toISOString().slice(0, 10),
    },
  });

  function addEmployee(data: EmployeeData) {
    setEmployees((prev) => [...prev, data]);
    reset({
      familySituation: "SINGLE",
      experienceYears: 0,
      hireDate: new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <div className="space-y-6">
      {employees.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{employees.length} employé(s) ajouté(s)</p>
          {employees.map((e, i) => (
            <div key={i} className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/30">
              <div>
                <p className="text-sm font-medium">{e.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {e.position} — {e.baseSalary.toLocaleString("fr-DZ")} DA base
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEmployees((p) => p.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(addEmployee)} className="space-y-4 border rounded-xl p-4 bg-muted/10">
        <p className="text-sm font-semibold">Ajouter un employé</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nom & Prénom *</Label>
            <Input {...register("fullName")} placeholder="ex. Ahmed Benali" />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Poste / Fonction *</Label>
            <Input {...register("position")} placeholder="ex. Comptable" />
            {errors.position && <p className="text-xs text-destructive">{errors.position.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Situation familiale</Label>
            <Select onValueChange={(v) => setValue("familySituation", v as EmployeeData["familySituation"])} defaultValue="SINGLE">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(FAMILY_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Salaire de base (DA) *</Label>
            <Input {...register("baseSalary")} type="number" placeholder="50000" />
            {errors.baseSalary && <p className="text-xs text-destructive">{errors.baseSalary.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Années d'ancienneté</Label>
            <Input {...register("experienceYears")} type="number" min="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Date d'embauche *</Label>
            <Input {...register("hireDate")} type="date" />
          </div>
        </div>
        <Button type="submit" variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </form>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-2" disabled={submitting}>
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Button>
        <Button onClick={() => onFinish(employees)} disabled={submitting} className="gap-2">
          {submitting ? "Enregistrement..." : (
            <>Terminer la configuration <ArrowRight className="h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Onboarding Component ────────────────────────────────────────────────

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<AssetData[]>([]);
  const [step3Data, setStep3Data] = useState<InventoryData[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();
  const { refetch: refetchCompany } = useGetCompany({ query: { enabled: false } });

  const upsertCompany = useUpsertCompany();
  const createAsset = useCreateAsset();
  const createItem = useCreateInventoryItem();
  const createMovement = useCreateInventoryMovement();
  const createEmployee = useCreateEmployee();

  async function handleFinish(employees: EmployeeData[]) {
    if (!step1Data) return;
    setSubmitting(true);
    try {
      await upsertCompany.mutateAsync({
        data: {
          name: step1Data.name,
          nif: step1Data.nif,
          ai: step1Data.ai,
          address: step1Data.address,
          legalForm: step1Data.legalForm,
        },
      });

      for (const a of step2Data) {
        await createAsset.mutateAsync({
          data: {
            label: a.label,
            category: a.category,
            costHt: a.costHt,
            purchaseDate: a.purchaseDate,
            lifeYears: a.lifeYears,
            residualValue: a.residualValue,
          },
        });
      }

      for (const inv of step3Data) {
        const item = await createItem.mutateAsync({
          data: { name: inv.name, category: inv.category, unit: inv.unit },
        });
        await createMovement.mutateAsync({
          data: {
            itemId: item.id,
            date: new Date().toISOString().slice(0, 10),
            quantity: inv.initialQty,
            direction: "IN",
            unitCostHt: inv.unitCostHt,
            note: "Stock initial — configuration initiale",
          },
        });
      }

      for (const emp of employees) {
        await createEmployee.mutateAsync({
          data: {
            fullName: emp.fullName,
            position: emp.position,
            familySituation: emp.familySituation,
            baseSalary: emp.baseSalary,
            experienceYears: emp.experienceYears,
            hireDate: emp.hireDate,
          },
        });
      }

      await refetchCompany();
      toast({ title: "Configuration terminée !", description: "Bienvenue sur DJERDJERA Comptable." });
      window.location.href = "/";
    } catch {
      toast({ title: "Erreur", description: "Une erreur s'est produite. Veuillez réessayer.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const stepTitles = [
    "Identité & Capital de l'entreprise",
    "Immobilisations (Actifs Fixes)",
    "Stock initial",
    "Personnel",
  ];
  const stepDescs = [
    "Saisissez les informations légales de votre entreprise.",
    "Enregistrez vos équipements et matériels. Vous pourrez en ajouter d'autres plus tard.",
    "Définissez votre inventaire de départ. Vous pourrez en ajouter d'autres plus tard.",
    "Ajoutez vos collaborateurs. Vous pourrez compléter la liste plus tard.",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--sidebar-background))] to-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8 space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground text-lg font-bold mb-3">
            D
          </div>
          <h1 className="text-2xl font-bold">Configuration initiale</h1>
          <p className="text-muted-foreground text-sm">
            Configurez votre espace comptable en quelques minutes.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <StepIndicator current={step} />
            <CardTitle className="text-xl">{stepTitles[step - 1]}</CardTitle>
            <CardDescription>{stepDescs[step - 1]}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {step === 1 && (
              <Step1Company
                onNext={(data) => {
                  setStep1Data(data);
                  setStep(2);
                }}
              />
            )}
            {step === 2 && (
              <Step2Assets
                onNext={(data) => {
                  setStep2Data(data);
                  setStep(3);
                }}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <Step3Inventory
                onNext={(data) => {
                  setStep3Data(data);
                  setStep(4);
                }}
                onBack={() => setStep(2)}
              />
            )}
            {step === 4 && (
              <Step4Personnel
                onFinish={handleFinish}
                onBack={() => setStep(3)}
                submitting={submitting}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
