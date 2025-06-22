// src/routes/webhook.routes.ts
import { Router } from "express";
import { WebhookController } from "../controllers/webhook.controller";
import { verifyGitHubWebhook } from "../middleware/webhook.middleware";

const router = Router();
const webhookController = new WebhookController();

router.post("/github", verifyGitHubWebhook, async (req, res, next) => {
  try {
    await webhookController.handlePullRequest(req, res);
    // Do not return the result, just await it
  } catch (err) {
    next(err);
  }
});

export { router as webhookRoutes };
