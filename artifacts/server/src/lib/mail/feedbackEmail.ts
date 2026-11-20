import { logger } from "../logger";

/**
 * Resend is used over plain `fetch` on purpose: one HTTP endpoint with a JSON
 * body, and no dependency to keep current. Everything here is optional — when
 * `RESEND_API_KEY` or `FEEDBACK_EMAIL_TO` is unset the feedback still lands in
 * Postgres (the caller writes the row first) and this module reports the miss.
 *
 * The recipient is deliberately not in code: `FEEDBACK_EMAIL_TO` is where the
 * address goes once it exists, so no deploy is needed to change it.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "Compta Helpe <onboarding@resend.dev>";
const SEND_TIMEOUT_MS = 10_000;

export interface FeedbackMailInput {
  id: string;
  category: string;
  message: string;
  /** Reply-to address, when the submitter left one. */
  contactEmail: string | null;
  /** Account email, always available — used as a fallback reply-to. */
  accountEmail: string | null;
  accountName: string | null;
  companyName: string | null;
  locale: string;
  /** ISO timestamp of the stored row. */
  submittedAt: string;
}

export type FeedbackMailResult =
  | { sent: true }
  | { sent: false; reason: string };

export function feedbackMailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.FEEDBACK_EMAIL_TO?.trim(),
  );
}

/**
 * Hands the notification to Resend.
 *
 * Never throws: a mail failure must not turn a stored feedback into a 500, and
 * the caller reports the outcome in the response instead.
 */
export async function sendFeedbackEmail(
  input: FeedbackMailInput,
): Promise<FeedbackMailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.FEEDBACK_EMAIL_TO?.trim();
  const from = process.env.FEEDBACK_EMAIL_FROM?.trim() || DEFAULT_FROM;

  if (!apiKey || !to) {
    logger.warn(
      { feedbackId: input.id },
      "feedback stored but not mailed: RESEND_API_KEY / FEEDBACK_EMAIL_TO is not set",
    );
    return { sent: false, reason: "mail-not-configured" };
  }

  const replyTo = input.contactEmail ?? input.accountEmail ?? undefined;
  const subject = `[Compta Helpe] ${categoryLabel(input.category)} — ${
    input.companyName ?? "sans société"
  }`;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: to.split(",").map((address) => address.trim()).filter(Boolean),
        subject,
        text: renderText(input),
        html: renderHtml(input),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      // Resend explains refusals in the body (unverified domain, bad from…).
      const detail = (await response.text().catch(() => "")).slice(0, 500);
      logger.warn(
        { feedbackId: input.id, status: response.status, detail },
        "feedback stored but the mail provider refused it",
      );
      return {
        sent: false,
        reason: `resend ${response.status}${detail ? `: ${detail}` : ""}`,
      };
    }

    return { sent: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.warn(
      { feedbackId: input.id, err: reason },
      "feedback stored but the mail request failed",
    );
    return { sent: false, reason };
  }
}

function categoryLabel(category: string): string {
  switch (category) {
    case "IDEA":
      return "Suggestion";
    case "BUG":
      return "Problème";
    default:
      return "Autre";
  }
}

function renderText(input: FeedbackMailInput): string {
  return [
    `Catégorie : ${categoryLabel(input.category)}`,
    `Langue : ${input.locale}`,
    `Société : ${input.companyName ?? "—"}`,
    `Compte : ${input.accountName ?? "—"}${input.accountEmail ? ` <${input.accountEmail}>` : ""}`,
    `Contact : ${input.contactEmail ?? "(utiliser l'e-mail du compte)"}`,
    `Reçu le : ${input.submittedAt}`,
    `Référence : ${input.id}`,
    "",
    input.message,
  ].join("\n");
}

function renderHtml(input: FeedbackMailInput): string {
  const rows: Array<[string, string]> = [
    ["Catégorie", categoryLabel(input.category)],
    ["Langue", input.locale],
    ["Société", input.companyName ?? "—"],
    [
      "Compte",
      `${input.accountName ?? "—"}${
        input.accountEmail ? ` <${input.accountEmail}>` : ""
      }`,
    ],
    ["Contact", input.contactEmail ?? "(e-mail du compte)"],
    ["Reçu le", input.submittedAt],
    ["Référence", input.id],
  ];

  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#f7fbff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #d9ecf7;border-radius:12px;overflow:hidden">
      <div style="background:#10a9d1;color:#ffffff;padding:18px 24px;font-size:16px;font-weight:600">
        Nouveau retour d'utilisateur
      </div>
      <div style="padding:24px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          ${rows
            .map(
              ([label, value]) =>
                `<tr><td style="padding:3px 12px 3px 0;color:#64748b;white-space:nowrap">${label}</td><td style="padding:3px 0">${escapeHtml(value)}</td></tr>`,
            )
            .join("\n          ")}
        </table>
        <div style="margin-top:20px;padding:16px;background:#f4fbff;border:1px solid #d9ecf7;border-radius:8px;white-space:pre-wrap;font-size:14px;line-height:1.55">${escapeHtml(
          input.message,
        )}</div>
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
