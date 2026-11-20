import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
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
import { Loader2 } from "lucide-react";
import type { TFunction } from "i18next";
import {
  isAccessPassActive,
  readAccessPass,
  type AccessPass,
} from "@/lib/access-pass";
import { AccessGate, PassBanner } from "@/components/access-gate";

const loginSchema = (t: TFunction) =>
  z.object({
    email: z.string().min(1, t("auth.emailRequired")).email(t("auth.emailInvalid")),
    password: z.string().min(1, t("auth.passwordRequired")),
  });

const registerSchema = (t: TFunction) =>
  z
    .object({
      firstName: z.string().min(1, t("auth.firstNameRequired")),
      lastName: z.string().min(1, t("auth.lastNameRequired")),
      email: z.string().min(1, t("auth.emailRequired")).email(t("auth.emailInvalid")),
      password: z.string().min(6, t("auth.passwordMin")),
      confirmPassword: z.string().min(1, t("auth.confirmRequired")),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t("auth.passwordMismatch"),
    });

type LoginValues = z.infer<ReturnType<typeof loginSchema>>;
type RegisterValues = z.infer<ReturnType<typeof registerSchema>>;

/**
 * The API replies with a machine-readable `{ error }` code rather than a
 * message meant for humans — translate the ones a user can actually act on.
 */
function toFrenchError(t: TFunction, error: unknown): string {
  const data = (error as { data?: { error?: unknown } } | null)?.data;
  const code = typeof data?.error === "string" ? data.error : "";

  switch (code) {
    case "Invalid credentials":
      return t("auth.errInvalidCredentials");
    case "Email already in use":
      return t("auth.errEmailInUse");
    case "Invalid login data":
    case "Invalid registration data":
      return t("auth.errInvalidData");
    default:
      return t("auth.errGeneric");
  }
}

export default function Login() {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const [, navigate] = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  // Paying is the price of admission: the subscription pass written by the
  // demo checkout is what unlocks these forms (client-side only).
  const [pass] = useState<AccessPass | null>(() => {
    const stored = readAccessPass();
    return isAccessPassActive(stored) ? stored : null;
  });

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema(t)),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema(t)),
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
      // `/login` is not a route once a session exists — without this the
      // authenticated shell mounts on it and renders the 404 page.
      navigate("/");
    } catch (error) {
      setFormError(toFrenchError(t, error));
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
      // A new account has no company yet: `/` renders the onboarding wizard
      // in that case, which is exactly where a signup should land.
      navigate("/");
    } catch (error) {
      setFormError(toFrenchError(t, error));
    }
  };

  if (!pass) return <AccessGate />;

  return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,hsl(var(--landing-cyan)/.16),transparent_34%),hsl(var(--background))] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Logo / Brand */}
          <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center justify-center">
            <img src="/logo.jpg" alt={t("landing.brand")} className="h-20 w-auto rounded-xl object-contain mix-blend-multiply" />
          </Link>
          <p className="text-muted-foreground text-sm">
            {t("auth.tagline")}
          </p>
        </div>

        <PassBanner pass={pass} />

        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{t("auth.welcome")}</CardTitle>
            <CardDescription>
              {t("auth.welcomeDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue={new URLSearchParams(window.location.search).get("register") === "true" ? "register" : "login"}
              onValueChange={() => setFormError(null)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
                <TabsTrigger value="register">{t("auth.register")}</TabsTrigger>
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
                          <FormLabel>{t("auth.email")}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              autoComplete="email"
                              placeholder={t("auth.emailPlaceholder")}
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
                          <FormLabel>{t("auth.password")}</FormLabel>
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
                          {t("auth.loggingIn")}
                        </>
                      ) : (
                        t("auth.login")
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
                            <FormLabel>{t("auth.firstName")}</FormLabel>
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
                            <FormLabel>{t("auth.lastName")}</FormLabel>
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
                          <FormLabel>{t("auth.email")}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              autoComplete="email"
                              placeholder={t("auth.emailPlaceholder")}
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
                          <FormLabel>{t("auth.password")}</FormLabel>
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
                          <FormLabel>{t("auth.confirmPassword")}</FormLabel>
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
                          {t("auth.creating")}
                        </>
                      ) : (
                        t("auth.createAccount")
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      {t("auth.afterRegister")}
                    </p>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          {t("auth.secureNote")}
        </p>
      </div>
    </div>
  );
}
