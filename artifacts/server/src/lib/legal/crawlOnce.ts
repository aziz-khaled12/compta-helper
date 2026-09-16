/**
 * Runs the crawl by hand, for one year or one issue.
 *
 *   pnpm --filter @workspace/server exec tsx src/lib/legal/crawlOnce.ts --year 2025
 *   pnpm --filter @workspace/server exec tsx src/lib/legal/crawlOnce.ts --year 2025 --issue 53
 *   pnpm --filter @workspace/server exec tsx src/lib/legal/crawlOnce.ts --year 2025 --issue 53 --force
 *
 * Not imported from `src/index.ts`, so `build.mjs` never bundles it. It exists
 * because the scheduler only ever walks back from the newest issue, and
 * verifying the pipeline needs the opposite: the one issue you have evidence
 * about.
 */
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { runCrawl } from "./crawl";

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const year = Number(argValue("--year") ?? new Date().getFullYear());
  const issue = argValue("--issue");
  const force = process.argv.includes("--force");

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid --year: ${year}`);
  }

  const outcome = await runCrawl({
    year,
    force,
    ...(issue ? { only: [Number(issue)] } : {}),
  });

  console.log("\ncrawl outcome:", JSON.stringify(outcome, null, 2));

  // What actually landed, so the run can be judged without opening psql.
  const counts = await db.execute(sql`
    select
      (select count(*) from legal_sources)             as sources,
      (select count(*) from legal_documents)           as documents,
      (select count(*) from company_legal_alerts)      as alerts,
      (select count(*) from company_legal_alerts
        where relevance = 'HIGH')                      as high_alerts
  `);
  console.log("tables:", JSON.stringify(counts.rows[0]));

  const sample = await db.execute(sql`
    select d.doc_kind, d.doc_number, left(coalesce(d.title_fr, d.title_ar), 78) as title,
           d.sectors, d.published_on
      from legal_documents d
     order by d.created_at desc
     limit 8
  `);
  console.log("\nnewest documents:");
  for (const r of sample.rows as Record<string, unknown>[]) {
    console.log(`  [${r["doc_kind"]} ${r["doc_number"] ?? ""}] ${r["title"]}`);
    console.log(`      sectors=${JSON.stringify(r["sectors"])} date=${r["published_on"]}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\ncrawl-once FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
