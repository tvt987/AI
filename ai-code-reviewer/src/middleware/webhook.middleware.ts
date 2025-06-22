import { Request, Response, NextFunction } from "express";

// Dummy middleware for verifying GitHub webhook signature
export function verifyGitHubWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Add your verification logic here
  next();
}
