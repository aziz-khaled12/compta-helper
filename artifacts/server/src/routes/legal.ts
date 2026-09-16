import { Router, type IRouter } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  db,
  companyLegalAlertsTable,
  legalDocumentsTable,
} from "@workspace/db";
import {
  ListLegalAlertsQueryParams,
  ListLegalAlertsResponse,
  AcknowledgeLegalAlertParams,
  AcknowledgeLegalAlertResponse,
  RefreshLegalAlertsResponse,
} from "@workspace/api-zod";
import { getActiveCompanyId } from "../lib/companyContext";
import { refreshAlertsForCompany } from "../lib/legal/crawl";

const router: IRouter = Router();

/**
 * Every route here is scoped by `companyId` resolved from the session, never by
 * an id taken from the request. An alert id alone must not be enough to read or
 * acknowledge another tenant's data — the same rule the funding delete follows.
 */

router.get("/legal/alerts", async (req, res): Promise<void> => {
  const params = ListLegalAlertsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.json([]);
    return;
  }

  const rows = await db
    .select({
      alert: companyLegalAlertsTable,
      document: legalDocumentsTable,
    })
    .from(companyLegalAlertsTable)
    .innerJoin(
      legalDocumentsTable,
      eq(legalDocumentsTable.id, companyLegalAlertsTable.documentId),
    )
    .where(
      params.data.includeAcknowledged
        ? eq(companyLegalAlertsTable.companyId, companyId)
        : and(
            eq(companyLegalAlertsTable.companyId, companyId),
            isNull(companyLegalAlertsTable.acknowledgedAt),
          ),
    )
    // Newest first, and by relevance within a day — the order a business owner
    // would triage in. `matchScore` breaks the tie so two texts published the
    // same day put the more specific one first.
    .orderBy(
      desc(legalDocumentsTable.publishedOn),
      desc(companyLegalAlertsTable.matchScore),
    );

  res.json(
    ListLegalAlertsResponse.parse(
      rows.map(({ alert, document }) => ({
        id: alert.id,
        documentId: document.id,
        docKind: document.docKind,
        docNumber: document.docNumber,
        titleFr: document.titleFr,
        titleAr: document.titleAr,
        summaryFr: document.summaryFr,
        summaryAr: document.summaryAr,
        publishedOn: document.publishedOn,
        pageFrom: document.pageFrom,
        year: document.year,
        issueNumber: document.issueNumber,
        relevance: alert.relevance,
        matchScore: Number(alert.matchScore),
        matchedOn: alert.matchedOn,
        acknowledgedAt: alert.acknowledgedAt?.toISOString() ?? null,
        createdAt: alert.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/legal/alerts/:id/acknowledge", async (req, res): Promise<void> => {
  const params = AcknowledgeLegalAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.status(404).json({ error: "No company configured" });
    return;
  }

  // The company filter is part of the WHERE, not a check afterwards: an alert
  // id belonging to someone else simply matches no row.
  const [updated] = await db
    .update(companyLegalAlertsTable)
    .set({ acknowledgedAt: new Date() })
    .where(
      and(
        eq(companyLegalAlertsTable.id, params.data.id),
        eq(companyLegalAlertsTable.companyId, companyId),
      ),
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Alerte introuvable" });
    return;
  }

  const [document] = await db
    .select()
    .from(legalDocumentsTable)
    .where(eq(legalDocumentsTable.id, updated.documentId));

  if (!document) {
    res.status(404).json({ error: "Alerte introuvable" });
    return;
  }

  res.json(
    AcknowledgeLegalAlertResponse.parse({
      id: updated.id,
      documentId: document.id,
      docKind: document.docKind,
      docNumber: document.docNumber,
      titleFr: document.titleFr,
      titleAr: document.titleAr,
      summaryFr: document.summaryFr,
      summaryAr: document.summaryAr,
      publishedOn: document.publishedOn,
      pageFrom: document.pageFrom,
      year: document.year,
      issueNumber: document.issueNumber,
      relevance: updated.relevance,
      matchScore: Number(updated.matchScore),
      matchedOn: updated.matchedOn,
      acknowledgedAt: updated.acknowledgedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    }),
  );
});

router.post("/legal/refresh", async (req, res): Promise<void> => {
  const companyId = await getActiveCompanyId(req.user?.id);
  if (!companyId) {
    res.status(400).json({ error: "Configurez d'abord le profil de l'entreprise" });
    return;
  }

  const refreshed = await refreshAlertsForCompany(companyId);
  res.json(RefreshLegalAlertsResponse.parse({ refreshed }));
});

export default router;
