import { GitHubService } from "./services/github-service";
import { GeminiService } from "./services/openai.service";
import * as readline from "readline";

const githubService = new GitHubService();
const geminiService = new GeminiService();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ANSI color codes for terminal
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
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
};

function colorize(text: string, color: string): string {
  return `${color}${text}${colors.reset}`;
}

function printHeader(title: string) {
  console.log("\n" + "=".repeat(80));
  console.log(colorize(title, colors.bright + colors.cyan));
  console.log("=".repeat(80));
}

function printFileHeader(
  filename: string,
  status: string,
  additions: number,
  deletions: number,
  language: string
) {
  const statusColor =
    status === "added"
      ? colors.green
      : status === "removed"
      ? colors.red
      : status === "modified"
      ? colors.yellow
      : colors.white;

  console.log("\n" + colorize(`📁 ${filename}`, colors.bright + colors.blue));
  console.log(colorize(`   Status: ${status.toUpperCase()}`, statusColor));
  console.log(colorize(`   Language: ${language}`, colors.magenta));
  console.log(colorize(`   Changes: +${additions} -${deletions}`, colors.cyan));
  console.log("─".repeat(60));
}

function printCodeChanges(changes: any) {
  const { added, removed, context } = changes;

  // Combine and sort all changes by line number
  const allChanges = [
    ...added.map((change: any) => ({ ...change, type: "added" })),
    ...removed.map((change: any) => ({ ...change, type: "removed" })),
    ...context.map((change: any) => ({ ...change, type: "context" })),
  ].sort((a, b) => a.line - b.line);

  if (allChanges.length === 0) {
    console.log(colorize("   (Không có thay đổi nội dung)", colors.dim));
    return;
  }

  allChanges.forEach((change) => {
    const lineNum = change.line.toString().padStart(4, " ");
    const prefix =
      change.type === "added" ? "+" : change.type === "removed" ? "-" : " ";

    const lineColor =
      change.type === "added"
        ? colors.green
        : change.type === "removed"
        ? colors.red
        : colors.dim;

    console.log(colorize(`${lineNum}${prefix} ${change.content}`, lineColor));
  });
}

async function previewPullRequest(
  owner: string,
  repo: string,
  prNumber: number
) {
  try {
    printHeader(`🔍 PREVIEW PULL REQUEST #${prNumber}`);
    console.log(colorize(`Repository: ${owner}/${repo}`, colors.bright));

    console.log(
      colorize("\n📡 Đang lấy thông tin Pull Request...", colors.yellow)
    );

    // Get PR info
    const prInfo = await githubService.getPullRequestInfo(
      owner,
      repo,
      prNumber
    );

    console.log(
      colorize(`\n📋 Thông tin Pull Request:`, colors.bright + colors.blue)
    );
    console.log(`   Tiêu đề: ${prInfo.title}`);
    console.log(`   Tác giả: ${prInfo.author}`);
    console.log(`   Trạng thái: ${prInfo.state}`);
    console.log(
      `   Tổng thay đổi: +${prInfo.additions} -${prInfo.deletions} (${prInfo.changed_files} files)`
    );

    if (prInfo.body) {
      console.log(
        `   Mô tả: ${prInfo.body.substring(0, 200)}${
          prInfo.body.length > 200 ? "..." : ""
        }`
      );
    }

    console.log(
      colorize("\n📂 Đang lấy danh sách files và changes...", colors.yellow)
    );

    // Get detailed changes
    const changes = await githubService.previewPullRequestChanges(
      owner,
      repo,
      prNumber
    );

    printHeader(`📁 FILES CHANGED (${changes.length} files)`);

    for (const file of changes) {
      printFileHeader(
        file.filename,
        file.status,
        file.additions,
        file.deletions,
        file.language
      );
      printCodeChanges(file.changes);

      // Ask if user wants AI review for this file
      if (file.changes.added.length > 0 || file.changes.removed.length > 0) {
        const shouldReview = await askQuestion(
          `\n🤖 Bạn có muốn AI review file ${file.filename}? (y/n): `
        );
        if (
          shouldReview.toLowerCase() === "y" ||
          shouldReview.toLowerCase() === "yes"
        ) {
          console.log(colorize("\n🤖 AI đang phân tích...", colors.yellow));

          // Create patch content for AI review
          const patchContent = [
            ...file.changes.removed.map((change) => `- ${change.content}`),
            ...file.changes.added.map((change) => `+ ${change.content}`),
          ].join("\n");

          if (patchContent.trim()) {
            const review = await geminiService.reviewCode(
              patchContent,
              file.language
            );
            console.log(
              colorize("\n🔍 AI Code Review:", colors.bright + colors.green)
            );
            console.log(colorize("─".repeat(60), colors.dim));
            console.log(review);
            console.log(colorize("─".repeat(60), colors.dim));
          }
        }
      }

      console.log("\n");
    }

    // Summary
    const totalAdditions = changes.reduce(
      (sum, file) => sum + file.additions,
      0
    );
    const totalDeletions = changes.reduce(
      (sum, file) => sum + file.deletions,
      0
    );

    printHeader("📊 SUMMARY");
    console.log(
      colorize(`✅ Tổng cộng: ${changes.length} files changed`, colors.bright)
    );
    console.log(colorize(`➕ Thêm: ${totalAdditions} lines`, colors.green));
    console.log(colorize(`➖ Xóa: ${totalDeletions} lines`, colors.red));
    console.log(
      colorize(
        `📈 Net change: ${totalAdditions - totalDeletions} lines`,
        colors.cyan
      )
    );
  } catch (error: any) {
    console.error(colorize("❌ Lỗi:", colors.red), error.message);
    if (error.status === 404) {
      console.log(colorize("💡 Kiểm tra lại tên repo và số PR", colors.yellow));
    }
  }
}

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log(
    colorize("🔍 PULL REQUEST CODE PREVIEW TOOL", colors.bright + colors.cyan)
  );
  console.log(
    colorize(
      "Xem trước code changes trong Pull Request với AI review",
      colors.dim
    )
  );
  console.log("\n");

  try {
    const owner = await askQuestion("👤 Nhập tên owner (vd: microsoft): ");
    const repo = await askQuestion("📁 Nhập tên repo (vd: vscode): ");
    const prNumber = await askQuestion("🔢 Nhập số PR (vd: 12345): ");

    if (!owner || !repo || !prNumber) {
      console.log(colorize("❌ Vui lòng nhập đầy đủ thông tin!", colors.red));
      rl.close();
      return;
    }

    await previewPullRequest(
      owner.trim(),
      repo.trim(),
      parseInt(prNumber.trim())
    );
  } catch (error) {
    console.error(colorize("❌ Lỗi:", colors.red), error);
  }

  rl.close();
}

main();
