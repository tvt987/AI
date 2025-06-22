import { Router, Request, Response } from "express";

const router = Router();

// Health check endpoint
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "AI Code Reviewer service is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness check endpoint
router.get("/ready", (req: Request, res: Response) => {
  // Add any readiness checks here (database connections, external services, etc.)
  res.status(200).json({
    status: "Ready",
    message: "Service is ready to accept requests",
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRoutes };
