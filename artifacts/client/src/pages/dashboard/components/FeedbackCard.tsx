import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import { CheckCircle2, MessageSquareHeart, Send } from "lucide-react";
import { useCreateFeedback } from "@workspace/api-client-react";
import { apiErrorMessage } from "@/lib/api-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ["IDEA", "BUG", "OTHER"] as const;
const MAX_MESSAGE = 2000;

const feedbackSchema = (t: TFunction) =>
  z.object({
    category: z.enum(CATEGORIES),
    message: z
      .string()
      .trim()
      .min(10, t("dashboard.feedback.messageRequired"))
      .max(MAX_MESSAGE, t("dashboard.feedback.messageTooLong", { max: MAX_MESSAGE })),
    contactEmail: z
      .string()
      .trim()
      .max(320)
      .refine((value) => value === "" || z.string().email().safeParse(value).success, {
        message: t("dashboard.feedback.emailInvalid"),
      }),
  });

type FeedbackFormValues = z.infer<ReturnType<typeof feedbackSchema>>;

/**
 * Feedback box on the dashboard.
 *
 * One message, one category, an optional reply-to. The API stores the feedback
 * before it tries to mail it, so success here means "recorded" — the toast does
 * not promise an email, because whether a mail goes out depends on server-side
 * mail configuration the user neither knows nor controls.
 */
export function FeedbackCard() {
  const { t, i18n } = useTranslation();
  const createFeedback = useCreateFeedback();
  const [sent, setSent] = useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema(t)),
    defaultValues: { category: "IDEA", message: "", contactEmail: "" },
  });

  const message = form.watch("message");

  const onSubmit = (values: FeedbackFormValues) => {
    createFeedback.mutate(
      {
        data: {
          category: values.category,
          message: values.message,
          contactEmail: values.contactEmail.trim() || null,
          locale: i18n.language.startsWith("ar") ? "ar" : "fr",
        },
      },
      {
        onSuccess: () => {
          setSent(true);
          form.reset();
        },
        onError: (error) => {
          toast.error(apiErrorMessage(error) ?? t("dashboard.feedback.error"));
        },
      },
    );
  };

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareHeart className="h-5 w-5 text-primary" />
          {t("dashboard.feedback.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("dashboard.feedback.subtitle")}</p>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="py-4 text-center space-y-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-medium">{t("dashboard.feedback.success")}</p>
            <p className="text-xs text-muted-foreground">{t("dashboard.feedback.successDesc")}</p>
            <Button variant="outline" size="sm" onClick={() => setSent(false)}>
              {t("dashboard.feedback.again")}
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("dashboard.feedback.category")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="IDEA">{t("dashboard.feedback.categoryIdea")}</SelectItem>
                          <SelectItem value="BUG">{t("dashboard.feedback.categoryBug")}</SelectItem>
                          <SelectItem value="OTHER">{t("dashboard.feedback.categoryOther")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("dashboard.feedback.contactEmail")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder={t("dashboard.feedback.contactEmailPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard.feedback.contactEmailHint")}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dashboard.feedback.message")}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        maxLength={MAX_MESSAGE}
                        placeholder={t("dashboard.feedback.messagePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground" aria-hidden>
                      {t("dashboard.feedback.messageHint", {
                        count: message.length,
                        max: MAX_MESSAGE,
                      })}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={createFeedback.isPending}>
                  <Send className="h-4 w-4 me-2 rtl:rotate-180" />
                  {createFeedback.isPending
                    ? t("dashboard.feedback.sending")
                    : t("dashboard.feedback.submit")}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
