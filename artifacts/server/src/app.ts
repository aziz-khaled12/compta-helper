import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

// Both Vercel (in front of the SPA) and Render (in front of this process) are
// reverse proxies, so without this Express reports their IPs and protocol
// rather than the client's.
app.set("trust proxy", 1);

/** Comma-separated allowlist; empty means "no cross-origin browser callers". */
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// `origin: true` reflected whatever Origin the caller sent *and* allowed
// credentials, so any site on the internet could make authenticated requests
// with the user's cookie. The browser never calls this API cross-origin under
// the Vercel-proxied setup (it only ever sees the Vercel domain), so an
// allowlist costs the app nothing and closes that hole for other callers.
// Outside production a missing allowlist still reflects, to keep local
// tooling pointed at localhost:8080 working unchanged.
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        // Same-origin, curl, and server-to-server calls send no Origin.
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      if (!isProduction && allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

export default app;
