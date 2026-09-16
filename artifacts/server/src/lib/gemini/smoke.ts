/**
 * Diagnostic for the Gemini wiring. Not part of the server bundle — nothing in
 * `src/index.ts` imports it, so `build.mjs` never sees it.
 *
 *   pnpm --filter @workspace/server exec tsx src/lib/gemini/smoke.ts
 *   pnpm --filter @workspace/server exec tsx src/lib/gemini/smoke.ts --pdf <path.pdf>
 *
 * Run this before changing `GEMINI_MODEL`. The model list moves under us, and
 * `GEMINI_MODEL` was pinned on the measured behaviour of this key rather than on
 * a version number, so the measurement is what needs re-running.
 */
import { readFileSync } from "node:fs";
import { Type } from "@google/genai";
import { GEMINI_MODEL, GEMINI_FALLBACK_MODEL, generateJson } from "./client";

const apiKey = process.env["GEMINI_API_KEY"];
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set. Add it to .env at the repo root.");
  process.exit(1);
}

const label = (s: string) => s.padEnd(26);

async function listModels(): Promise<void> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=200`,
  );
  const body = (await res.json()) as {
    models?: { name: string; supportedGenerationMethods?: string[] }[];
  };
  const usable = (body.models ?? [])
    .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m) => m.name.replace("models/", ""))
    .filter((n) => /2\.5|3/.test(n) && !/embedding|aqa|image|tts|native-audio|lyria/.test(n))
    .sort();

  console.log(`\nModels available to this key (${usable.length}):`);
  for (const n of usable) {
    const mark = n === GEMINI_MODEL ? " <- GEMINI_MODEL" : n === GEMINI_FALLBACK_MODEL ? " <- fallback" : "";
    console.log("  " + n + mark);
  }

  if (!usable.includes(GEMINI_MODEL)) {
    console.error(`\n!! GEMINI_MODEL "${GEMINI_MODEL}" is NOT available to this key.`);
    process.exitCode = 1;
  }
}

async function probeStructuredOutput(): Promise<void> {
  console.log("\nStructured output through the real client (with retry + fallback):");
  const started = Date.now();
  const out = await generateJson<{ findings: { ruleId: string; titre: string }[] }>({
    contents:
      "Reformule ce constat comptable en une phrase simple pour un dirigeant non-comptable : " +
      "TVA nette due 145 000 DA, échéance dépassée de 12 jours. Rends un objet { findings: [...] }.",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        findings: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { ruleId: { type: Type.STRING }, titre: { type: Type.STRING } },
            required: ["ruleId", "titre"],
          },
        },
      },
      required: ["findings"],
    },
  });
  console.log(`  ${label("OK")} ${Date.now() - started}ms  ${JSON.stringify(out.findings?.[0])}`);
}

async function probePdf(path: string): Promise<void> {
  console.log(`\nPDF extraction (${path}):`);
  const bytes = readFileSync(path);
  const started = Date.now();
  const out = await generateJson<{ decrees: { kind: string; titleFr: string }[] }>({
    contents: [
      { inlineData: { mimeType: "application/pdf", data: bytes.toString("base64") } },
      { text: "Extrais chaque texte réglementaire contenu dans ce Journal Officiel : type et titre en français." },
    ],
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        decrees: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { kind: { type: Type.STRING }, titleFr: { type: Type.STRING } },
            required: ["kind", "titleFr"],
          },
        },
      },
      required: ["decrees"],
    },
  });
  console.log(`  ${label("OK")} ${Date.now() - started}ms  decrees=${out.decrees?.length}`);
  out.decrees?.slice(0, 3).forEach((d) => console.log(`    [${d.kind}] ${d.titleFr.slice(0, 88)}`));
}

async function main(): Promise<void> {
  const pdfArg = process.argv.indexOf("--pdf");
  await listModels();
  await probeStructuredOutput();
  if (pdfArg !== -1 && process.argv[pdfArg + 1]) {
    await probePdf(process.argv[pdfArg + 1]);
  }
  console.log("\nSmoke check complete.");
}

main().catch((err) => {
  console.error("\nSmoke check FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
