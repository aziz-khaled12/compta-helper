import { Router, type IRouter } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  db,
  companiesTable,
  feedbackTable,
  usersTable,
} from "@workspace/db";
import { CreateFeedbackBody, type FeedbackReceipt } from "@workspace/api-zod";
import { getActiveCompanyId } from "../lib/companyContext";
import { sendFeedbackEmail } from "../lib/mail/feedbackEmail";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** A user can write a lot of feedback; this only stops a runaway loop. */
const MAX_PER_HOUR = 10;

/**
 * Dashboard feedback.
 *
 * Order matters: the row is inserted before any mail is attempted, so the
 * answer is "recorded" even when nobody can be emailed yet (no
 * `FEEDBACK_EMAIL_TO`, no Resend key, provider down). The receipt's `emailed`
 * flag reports that hop honestly without turning it into a user-facing error —
 * the feedback is safe either way, and a resend is possible from the row.
 */
router.post("/feedback", async (req, res): Promise<void> => {
  const body = CreateFeedbackBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const userId = req.user?.id ?? null;
  const since = new Date(Date.now() - 60 * 60 * 1000);

  if (userId) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(feedbackTable)
      .where(
        and(eq(feedbackTable.userId, userId), gte(feedbackTable.createdAt, since)),
      );
    if (count >= MAX_PER_HOUR) {
      res.status(429).json({
        error: "Trop de retours envoyés récemment. Réessayez dans un moment.",
      });
      return;
    }
  }

  const companyId = await getActiveCompanyId(req.user?.id);

  const [account] = userId
    ? await db
        .select({
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1)
    : [];

  const [company] = companyId
    ? await db
        .select({ name: companiesTable.name })
        .from(companiesTable)
        .where(eq(companiesTable.id, companyId))
        .limit(1)
    : [];

  const { category, message: rawMessage, contactEmail, locale } = body.data;

  // Zod trims nothing: a body of ten spaces would otherwise pass and store a
  // row nobody can read back. The client trims too, but the API is reachable
  // without it.
  const message = rawMessage.trim();
  if (message.length < 10) {
    res.status(400).json({
      error: "Le message doit contenir au moins 10 caractères.",
    });
    return;
  }

  const [row] = await db
    .insert(feedbackTable)
    .values({
      userId,
      companyId,
      category,
      message,
      contactEmail: contactEmail?.trim() || null,
      locale: locale ?? "fr",
    })
    .returning();

  const result = await sendFeedbackEmail({
    id: row.id,
    category: row.category,
    message: row.message,
    contactEmail: row.contactEmail,
    accountEmail: account?.email ?? null,
    accountName:
      [account?.firstName, account?.lastName].filter(Boolean).join(" ").trim() ||
      null,
    companyName: company?.name ?? null,
    locale: row.locale,
    submittedAt: row.createdAt.toISOString(),
  });

  // Delivery bookkeeping is best effort: a failed update must not lose the
  // feedback that is already stored, so it is logged and swallowed.
  try {
    await db
      .update(feedbackTable)
      .set(
        result.sent
          ? { deliveredAt: new Date(), deliveryError: null }
          : { deliveryError: result.reason.slice(0, 1000) },
      )
      .where(eq(feedbackTable.id, row.id));
  } catch (err) {
    logger.warn(
      { feedbackId: row.id, err: err instanceof Error ? err.message : String(err) },
      "feedback delivery status could not be written",
    );
  }

  const receipt: FeedbackReceipt = {
    id: row.id,
    createdAt: row.createdAt,
    emailed: result.sent,
  };
  res.status(201).json(receipt);
});

export default router;
