// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { healthRoutes } from "./routes/health.routes";
import { webhookRoutes } from "./routes/webhook.routes";

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.raw({ type: "application/json", limit: "10mb" }));

// Routes
app.use("/webhook", webhookRoutes);
app.use("/health", healthRoutes);

// Error handling
app.use(
  (
    error: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
);

export { app };
