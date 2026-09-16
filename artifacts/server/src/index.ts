import app from "./app";
import { logger } from "./lib/logger";
import { assertGeminiConfigured } from "./lib/gemini/client";
import { startCrawlScheduler } from "./lib/scheduler";

// Fail at boot rather than on first use. The Gemini calls are all background
// work (the crawl, the narration), so a missing key would otherwise surface as
// a failed run an hour later instead of a server that refuses to start.
assertGeminiConfigured();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Started after `listen`, not before: the API is the reason this process
  // exists, and a crawl must never delay the port opening. The scheduler owns
  // its own initial delay and its own error handling, so this call is the whole
  // of the coupling.
  startCrawlScheduler();
});
