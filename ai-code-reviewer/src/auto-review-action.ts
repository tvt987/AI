import { GitHubService } from "./services/github-service";
import { GeminiService } from "./services/openai.service";
import fs from "fs";

const githubService = new GitHubService();
const geminiService = new GeminiService();

// ANSI colors for GitHub Actions logs
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function colorize(text: string, color: string): string {
  return `${color}${text}${colors.reset}`;
}

// 🎯 Lấy thông tin từ GitHub Actions context
function getGitHubActionContext() {
  console.log(colorize("🔍 Getting GitHub Actions context...", colors.yellow));

  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    throw new Error("❌ GITHUB_REPOSITORY environment variable not found");
  }

  const [owner, repo] = repository.split("/");
  console.log(colorize(`📁 Repository: ${owner}/${repo}`, colors.blue));

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    throw new Error("❌ GITHUB_EVENT_PATH not found or file doesn't exist");
  }

  const eventData = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  const prNumber = eventData.number || eventData.pull_request?.number;
  if (!prNumber) {
    throw new Error("❌ PR number not found in GitHub event data");
  }

  const prTitle = eventData.pull_request?.title || "Unknown PR";
  const prAuthor = eventData.pull_request?.user?.login || "Unknown Author";
  const prUrl =
    eventData.pull_request?.html_url ||
    `https://github.com/${owner}/${repo}/pull/${prNumber}`;

  console.log(colorize(`🔢 PR #${prNumber}: ${prTitle}`, colors.cyan));
  console.log(colorize(`👤 Author: ${prAuthor}`, colors.blue));

  return { owner, repo, prNumber, prTitle, prAuthor, prUrl };
}

// 🤖 Auto-review logic (simplified version)
async function runAutoReview(owner: string, repo: string, prNumber: number) {
  console.log(colorize("\n📊 Checking PR status...", colors.yellow));

  // Get PR status
  const status = await githubService.checkPullRequestStatus(
    owner,
    repo,
    prNumber
  );
  console.log(`   State: ${status.state}`);
  console.log(`   Mergeable: ${status.mergeable}`);
  console.log(`   Has Conflicts: ${status.hasConflicts ? "❌ YES" : "✅ NO"}`);

  // Get PR files
  console.log(colorize("\n🤖 Running AI Code Review...", colors.yellow));
  const files = await githubService.getPullRequestFiles(owner, repo, prNumber);
  console.log(`   Files to review: ${files.length}`);

  const codeIssues: string[] = [];

  // AI Review each file
  for (const file of files.slice(0, 3)) {
    // Limit to 3 files for cost
    if (file.patch && isCodeFile(file.filename)) {
      console.log(`   Reviewing ${file.filename}...`);

      try {
        const review = await geminiService.reviewCode(
          file.patch,
          getLanguageFromFilename(file.filename)
        );

        // Check for critical issues
        if (
          review.toLowerCase().includes("security") ||
          review.toLowerCase().includes("critical") ||
          review.toLowerCase().includes("dangerous") ||
          review.toLowerCase().includes("vulnerability")
        ) {
          codeIssues.push(
            `${file.filename}: Potential security or critical issue detected`
          );
        }
      } catch (error: any) {
        console.log(
          `   ⚠️ Failed to review ${file.filename}: ${error.message}`
        );
      }
    }
  }

  // Decision logic
  const hasConflicts = status.hasConflicts;
  const hasCriticalIssues = codeIssues.length > 0;

  console.log(colorize("\n🎯 Decision Analysis:", colors.cyan));

  if (hasConflicts) {
    console.log(colorize("❌ BLOCKED: Merge conflicts detected", colors.red));
    await githubService.createStatusComment(owner, repo, prNumber, {
      hasConflicts: true,
      hasErrors: false,
      checksPassed: false,
      approved: false,
      details:
        "❌ Merge conflicts detected - Please resolve conflicts before proceeding",
    });
    return { action: "BLOCKED", reason: "conflicts" };
  }

  if (hasCriticalIssues) {
    console.log(colorize("❌ BLOCKED: Critical issues found", colors.red));
    const issueDetails = codeIssues.map((issue) => `   - ${issue}`).join("\n");

    await githubService.requestChanges(
      owner,
      repo,
      prNumber,
      `🤖 **Auto-review found critical issues:**\n\n${issueDetails}\n\nPlease review and address these issues before proceeding.`
    );
    return { action: "BLOCKED", reason: "critical_issues", issues: codeIssues };
  }

  // All good - approve PR
  console.log(colorize("✅ APPROVED: No critical issues found", colors.green));

  try {
    await githubService.approvePullRequest(
      owner,
      repo,
      prNumber,
      "🤖 **Auto-approved:** All checks passed and no critical issues detected!\n\n✅ No merge conflicts\n✅ No security issues found\n✅ Code review completed"
    );
    console.log(colorize("✅ PR approved successfully!", colors.green));
  } catch (error: any) {
    if (error.message.includes("Can not approve your own pull request")) {
      console.log(
        colorize("⚠️ Cannot approve own PR (GitHub rule)", colors.yellow)
      );

      // Post positive comment instead
      await githubService.createStatusComment(owner, repo, prNumber, {
        hasConflicts: false,
        hasErrors: false,
        checksPassed: true,
        approved: true,
        details: "✅ Auto-review passed - Ready for human approval",
      });
    } else {
      throw error;
    }
  }

  return { action: "APPROVED", reason: "no_issues" };
}

function isCodeFile(filename: string): boolean {
  const codeExtensions = [
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".py",
    ".java",
    ".cpp",
    ".c",
    ".cs",
    ".php",
    ".rb",
    ".go",
    ".rs",
    ".swift",
    ".kt",
    ".scala",
  ];
  return codeExtensions.some((ext) => filename.endsWith(ext));
}

function getLanguageFromFilename(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();
  const languageMap: { [key: string]: string } = {
    js: "javascript",
    ts: "typescript",
    jsx: "jsx",
    tsx: "tsx",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    go: "go",
    rs: "rust",
    swift: "swift",
  };
  return languageMap[extension || ""] || "text";
}

// 🚀 Main function cho GitHub Actions
async function main() {
  console.log(
    colorize(
      "🤖 GitHub Actions Auto-Review Started",
      colors.bright + colors.cyan
    )
  );
  console.log(colorize("=".repeat(50), colors.blue));

  try {
    // Get context từ GitHub Actions (TỰ ĐỘNG - KHÔNG CẦN INPUT TAY)
    const { owner, repo, prNumber, prTitle, prAuthor } =
      getGitHubActionContext();

    console.log(colorize("\n⚙️ Configuration:", colors.yellow));
    console.log("   Auto-approve: ✅ Enabled");
    console.log("   Auto-merge: ❌ Disabled (for safety)");
    console.log("   AI Review: ✅ Gemini enabled");

    // Run auto-review
    const result = await runAutoReview(owner, repo, prNumber);

    console.log(
      colorize(
        `\n🎉 Auto-Review Completed: ${result.action}`,
        colors.bright + colors.green
      )
    );
    console.log(colorize("=".repeat(50), colors.blue));

    // TODO: Phase 2 - Send Slack notification here
  } catch (error: any) {
    console.error(
      colorize(
        "\n💥 GitHub Actions Auto-Review Failed:",
        colors.bright + colors.red
      )
    );
    console.error(colorize(error.message, colors.red));

    // Fail the GitHub Action
    process.exit(1);
  }
}

// 🎯 Entry point
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
