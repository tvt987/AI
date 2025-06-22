import { GitHubService } from "./services/github-service";
import { GeminiService } from "./services/openai.service";
import * as readline from "readline";

const githubService = new GitHubService();
const geminiService = new GeminiService();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function colorize(text: string, color: string): string {
  return `${color}${text}${colors.reset}`;
}

async function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function autoReviewPR(
  owner: string,
  repo: string,
  prNumber: number,
  options: {
    autoApprove: boolean;
    autoMerge: boolean;
  }
) {
  console.log(
    colorize(
      `\n🤖 AUTO REVIEW PULL REQUEST #${prNumber}`,
      colors.bright + colors.cyan
    )
  );
  console.log(colorize(`Repository: ${owner}/${repo}`, colors.bright));
  console.log(
    colorize(
      `Settings: Auto-approve=${options.autoApprove}, Auto-merge=${options.autoMerge}`,
      colors.magenta
    )
  );

  try {
    // Step 1: Check PR status
    console.log(colorize("\n📊 Checking PR status...", colors.yellow));
    const status = await githubService.checkPullRequestStatus(
      owner,
      repo,
      prNumber
    );

    console.log(colorize("\n📋 PR Status:", colors.bright));
    console.log(`   State: ${status.state}`);
    console.log(`   Mergeable: ${status.mergeable}`);
    console.log(`   Mergeable State: ${status.mergeableState}`);
    console.log(
      `   Has Conflicts: ${status.hasConflicts ? "❌ YES" : "✅ NO"}`
    );

    // Check CI/CD status
    console.log(colorize("\n🔄 Checking CI/CD status...", colors.yellow));
    const failedChecks = status.checkRuns.filter(
      (check) =>
        check.conclusion === "failure" ||
        check.conclusion === "cancelled" ||
        check.conclusion === "timed_out"
    );
    const pendingChecks = status.checkRuns.filter(
      (check) => check.status === "queued" || check.status === "in_progress"
    );
    const hasErrors = failedChecks.length > 0;
    const checksPending = pendingChecks.length > 0;
    const checksPassed =
      status.checkRuns.length > 0 &&
      status.checkRuns.every((check) => check.conclusion === "success");

    console.log(colorize("\n🧪 CI/CD Checks:", colors.bright));
    if (status.checkRuns.length === 0) {
      console.log("   No CI/CD checks configured");
    } else {
      status.checkRuns.forEach((check) => {
        const statusEmoji =
          check.conclusion === "success"
            ? "✅"
            : check.conclusion === "failure"
            ? "❌"
            : check.status === "in_progress"
            ? "🔄"
            : "⏳";
        console.log(
          `   ${statusEmoji} ${check.name}: ${check.conclusion || check.status}`
        );
      });
    }

    // Check reviews
    console.log(colorize("\n👥 Review Status:", colors.bright));
    const approvals = status.reviews.filter(
      (review) => review.state === "APPROVED"
    );
    const changeRequests = status.reviews.filter(
      (review) => review.state === "CHANGES_REQUESTED"
    );
    const hasApprovals = approvals.length > 0;
    const hasChangeRequests = changeRequests.length > 0;

    console.log(
      `   Approvals: ${hasApprovals ? `✅ ${approvals.length}` : "❌ 0"}`
    );
    console.log(
      `   Change Requests: ${
        hasChangeRequests ? `⚠️ ${changeRequests.length}` : "✅ 0"
      }`
    );

    // AI Code Review
    console.log(colorize("\n🤖 Running AI Code Review...", colors.yellow));
    const files = await githubService.getPullRequestFiles(
      owner,
      repo,
      prNumber
    );
    const codeIssues: string[] = [];

    for (const file of files.slice(0, 3)) {
      // Limit for cost
      if (file.patch && isCodeFile(file.filename)) {
        console.log(`   Reviewing ${file.filename}...`);
        const review = await geminiService.reviewCode(
          file.patch,
          getLanguageFromFilename(file.filename)
        );

        // Simple check for serious issues (you can make this more sophisticated)
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
      }
    }

    // Decision Logic
    console.log(
      colorize("\n🎯 Decision Analysis:", colors.bright + colors.cyan)
    );

    const decision = {
      hasConflicts: status.hasConflicts,
      hasErrors: hasErrors || hasChangeRequests,
      checksPassed: status.checkRuns.length === 0 || checksPassed, // Pass if no checks or all pass
      approved: hasApprovals && !hasChangeRequests,
      hasCriticalIssues: codeIssues.length > 0,
      canProceed: false,
      action: "",
      details: "",
    };

    let details = [];

    if (decision.hasConflicts) {
      details.push("❌ Merge conflicts detected");
      decision.action = "BLOCK - Resolve conflicts";
    } else if (decision.hasErrors) {
      details.push("❌ CI/CD checks failed or changes requested");
      decision.action = "BLOCK - Fix errors/address feedback";
    } else if (decision.hasCriticalIssues) {
      details.push("⚠️ AI detected potential critical issues");
      details.push(...codeIssues.map((issue) => `   - ${issue}`));
      decision.action = "BLOCK - Review AI findings";
    } else if (checksPending) {
      details.push("🔄 CI/CD checks still running");
      decision.action = "WAIT - Let checks complete";
    } else if (!decision.approved && status.checkRuns.length > 0) {
      details.push("📋 Waiting for human review approval");
      decision.action = "WAIT - Needs approval";
    } else {
      details.push("✅ All checks passed");
      details.push("✅ No conflicts detected");
      details.push("✅ No critical issues found");
      decision.canProceed = true;
      decision.action = options.autoMerge ? "AUTO-MERGE" : "AUTO-APPROVE";
    }

    decision.details = details.join("\n");

    // Create status comment
    await githubService.createStatusComment(owner, repo, prNumber, {
      hasConflicts: decision.hasConflicts,
      hasErrors: decision.hasErrors,
      checksPassed: decision.checksPassed,
      approved: decision.approved,
      details: decision.details,
    });

    console.log(
      colorize(
        `\n📝 Status: ${decision.action}`,
        decision.canProceed ? colors.green : colors.red
      )
    );
    console.log(decision.details);

    // Take action if possible
    if (decision.canProceed && options.autoApprove) {
      console.log(colorize("\n✅ Auto-approving PR...", colors.green));
      try {
        await githubService.approvePullRequest(
          owner,
          repo,
          prNumber,
          "🤖 Automatically approved: All checks passed and no issues detected!"
        );
        console.log(colorize("✅ PR approved successfully!", colors.green));
      } catch (approveError: any) {
        if (
          approveError.message.includes("Can not approve your own pull request")
        ) {
          console.log(
            colorize("⚠️ Cannot approve own PR (GitHub rule)", colors.yellow)
          );
          console.log(
            colorize("💬 Posted status comment instead", colors.blue)
          );
        } else {
          throw approveError;
        }
      }

      if (options.autoMerge) {
        const confirmMerge = await askQuestion(
          colorize("\n🚀 Ready to auto-merge. Continue? (y/n): ", colors.yellow)
        );
        if (confirmMerge.toLowerCase() === "y") {
          console.log(colorize("🔄 Merging PR...", colors.green));
          await githubService.mergePullRequest(owner, repo, prNumber, {
            commitTitle: `Merge PR #${prNumber} (auto-merged)`,
            mergeMethod: "merge",
          });
          console.log(
            colorize("🎉 PR successfully merged!", colors.bright + colors.green)
          );
        }
      }
    } else if (!decision.canProceed && decision.hasErrors) {
      console.log(colorize("\n⚠️ Creating change request...", colors.yellow));
      await githubService.requestChanges(
        owner,
        repo,
        prNumber,
        `🤖 Automated review found issues:\n\n${decision.details}\n\nPlease address these issues before proceeding.`
      );
    }
  } catch (error: any) {
    console.error(colorize("❌ Error:", colors.red), error.message);
    if (error.status === 401) {
      console.log(
        colorize(
          "🔑 Tip: Check your GitHub token in src/config/env.ts",
          colors.yellow
        )
      );
    } else if (error.status === 404) {
      console.log(
        colorize(
          "🔍 Tip: Make sure the repo and PR number exist",
          colors.yellow
        )
      );
    }
  }
}

function isCodeFile(filename: string): boolean {
  const codeExtensions = [
    ".js",
    ".ts",
    ".py",
    ".java",
    ".cpp",
    ".go",
    ".rs",
    ".php",
    ".rb",
    ".cs",
  ];
  return codeExtensions.some((ext) => filename.endsWith(ext));
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const languageMap: { [key: string]: string } = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    java: "java",
    cpp: "cpp",
    go: "go",
    rs: "rust",
    php: "php",
    rb: "ruby",
    cs: "csharp",
  };
  return languageMap[ext || ""] || "code";
}

async function main() {
  console.log(
    colorize("🤖 AUTO PR REVIEW & MERGE TOOL", colors.bright + colors.cyan)
  );
  console.log(
    colorize(
      "Automatically review, approve, and merge pull requests",
      colors.dim
    )
  );
  console.log("\n");

  try {
    const owner = await askQuestion("👤 Owner (vd: microsoft): ");
    const repo = await askQuestion("📁 Repo (vd: vscode): ");
    const prNumber = await askQuestion("🔢 PR Number: ");

    console.log(colorize("\n⚙️ Auto-merge Settings:", colors.bright));
    const autoApprove = await askQuestion(
      "✅ Auto-approve if no issues? (y/n): "
    );
    const autoMerge =
      autoApprove.toLowerCase() === "y"
        ? await askQuestion("🚀 Auto-merge if approved? (y/n): ")
        : "n";

    const options = {
      autoApprove: autoApprove.toLowerCase() === "y",
      autoMerge: autoMerge.toLowerCase() === "y",
    };

    await autoReviewPR(
      owner.trim(),
      repo.trim(),
      parseInt(prNumber.trim()),
      options
    );
  } catch (error) {
    console.error(colorize("❌ Error:", colors.red), error);
  }

  rl.close();
}

main();
