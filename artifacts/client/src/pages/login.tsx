import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@workspace/auth-web";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, BarChart2, Users, Package, Loader2 } from "lucide-react";

const FEATURES = [
  { icon: BarChart2, label: "Tableau de bord", desc: "KPIs en temps réel" },
  { icon: BookOpen, label: "Journal", desc: "Ventes & Achats" },
  { icon: Users, label: "Personnel & Paie", desc: "IRG + CNAS auto" },
  { icon: Package, label: "Stocks", desc: "Valeur pondérée" },
];

const loginSchema = z.object({
  email: z.string().min(1, "Email requis").email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

const registerSchema = z
  .object({
    firstName: z.string().min(1, "Prénom requis"),
    lastName: z.string().min(1, "Nom requis"),
    email: z.string().min(1, "Email requis").email("Email invalide"),
    password: z.string().min(6, "6 caractères minimum"),
    confirmPassword: z.string().min(1, "Confirmation requise"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas",
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

/**
 * The API replies with a machine-readable `{ error }` code rather than a
 * message meant for humans — translate the ones a user can actually act on.
 */
function toFrenchError(error: unknown): string {
  const data = (error as { data?: { error?: unknown } } | null)?.data;
  const code = typeof data?.error === "string" ? data.error : "";

  switch (code) {
    case "Invalid credentials":
      return "Email ou mot de passe incorrect.";
    case "Email already in use":
      return "Cet email est déjà utilisé.";
    case "Invalid login data":
    case "Invalid registration data":
      return "Veuillez vérifier les informations saisies.";
    default:
      return "Une erreur s'est produite. Veuillez réessayer.";
  }
}

export default function Login() {
  const { login, register } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLogin = async (values: LoginValues) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
    } catch (error) {
      setFormError(toFrenchError(error));
    }
  };

  const onRegister = async (values: RegisterValues) => {
    setFormError(null);
    try {
      await register({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
      });
    } catch (error) {
      setFormError(toFrenchError(error));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--sidebar-background))] to-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold shadow-lg">
            D
          </div>
          <h1 className="text-3xl font-bold tracking-tight">DJERDJERA</h1>
          <p className="text-muted-foreground text-sm">
            Système de comptabilité — SCF Algérie
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-xl border bg-card p-4 space-y-1">
              <Icon className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium leading-none">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Bienvenue</CardTitle>
            <CardDescription>
              Connectez-vous ou créez votre espace comptable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="login"
              onValueChange={() => setFormError(null)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Se connecter</TabsTrigger>
                <TabsTrigger value="register">Créer un compte</TabsTrigger>
              </TabsList>

              {formError && (
                <p className="mt-4 text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLogin)}
                    className="space-y-4 pt-2"
                  >
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              autoComplete="email"
                              placeholder="vous@exemple.dz"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mot de passe</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="current-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-11"
                      disabled={loginForm.formState.isSubmitting}
                    >
                      {loginForm.formState.isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connexion…
                        </>
                      ) : (
                        "Se connecter"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit(onRegister)}
                    className="space-y-4 pt-2"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={registerForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prénom</FormLabel>
                            <FormControl>
                              <Input autoComplete="given-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom</FormLabel>
                            <FormControl>
                              <Input autoComplete="family-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              autoComplete="email"
                              placeholder="vous@exemple.dz"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mot de passe</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmer le mot de passe</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-11"
                      disabled={registerForm.formState.isSubmitting}
                    >
                      {registerForm.formState.isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Création…
                        </>
                      ) : (
                        "Créer mon compte"
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Vous configurerez votre entreprise juste après.
                    </p>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Connexion sécurisée — vos données restent privées.
        </p>
      </div>
    </div>
  );
}
