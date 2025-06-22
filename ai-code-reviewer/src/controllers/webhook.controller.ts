import { Request, Response } from "express";
import { GeminiService } from "../services/openai.service";
import { GitHubService } from "../services/github-service";

export class WebhookController {
  private germiniService: GeminiService;
  private githubService: GitHubService;

  constructor() {
    this.germiniService = new GeminiService();
    this.githubService = new GitHubService();
  }

  async handlePullRequest(req: Request, res: Response) {
    const { action, pull_request, repository } = req.body;

    if (action !== "opened" && action !== "synchronize") {
      return res.status(200).send("Event ignored");
    }

    try {
      const files = await this.githubService.getPullRequestFiles(
        repository.owner.login,
        repository.name,
        pull_request.number
      );

      for (const file of files.slice(0, 3)) {
        // Limit to 3 files for cost
        if (file.patch && this.isCodeFile(file.filename)) {
          const review = await this.germiniService.reviewCode(
            file.patch,
            this.getLanguageFromFilename(file.filename)
          );

          await this.githubService.createReviewComment(
            repository.owner.login,
            repository.name,
            pull_request.number,
            `🤖 **AI Code Review for ${file.filename}**\n\n${review}`
          );
        }
      }

      res.status(200).send("Review completed");
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send("Internal server error");
    }
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = [".js", ".ts", ".py", ".java", ".cpp", ".go", ".rs"];
    return codeExtensions.some((ext) => filename.endsWith(ext));
  }

  private getLanguageFromFilename(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      js: "javascript",
      ts: "typescript",
      py: "python",
      java: "java",
      cpp: "cpp",
      go: "go",
      rs: "rust",
    };
    return languageMap[ext || ""] || "code";
  }
}
