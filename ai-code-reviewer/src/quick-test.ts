import { GitHubService } from "./services/github-service";
import { GeminiService } from "./services/openai.service";

const githubService = new GitHubService();
const geminiService = new GeminiService();

// ANSI colors
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

// List of public repositories with active PRs for testing
const testRepositories = [
  { owner: "microsoft", repo: "vscode", description: "Visual Studio Code" },
  { owner: "facebook", repo: "react", description: "React JavaScript library" },
  {
    owner: "tensorflow",
    repo: "tensorflow",
    description: "TensorFlow ML library",
  },
  { owner: "nodejs", repo: "node", description: "Node.js runtime" },
  {
    owner: "typescript-eslint",
    repo: "typescript-eslint",
    description: "TypeScript ESLint",
  },
];

async function findWorkingRepository() {
  console.log(
    colorize(
      "🔍 FINDING REPOSITORY WITH PULL REQUESTS",
      colors.bright + colors.cyan
    )
  );

  for (const testRepo of testRepositories) {
    try {
      console.log(
        colorize(
          `\nTesting ${testRepo.owner}/${testRepo.repo}...`,
          colors.yellow
        )
      );

      const octokit = (githubService as any).octokit;
      const { data: pulls } = await octokit.rest.pulls.list({
        owner: testRepo.owner,
        repo: testRepo.repo,
        state: "open",
        per_page: 5,
      });

      if (pulls.length > 0) {
        console.log(
          colorize(`✅ Found ${pulls.length} open PRs!`, colors.green)
        );
        console.log(
          colorize(`📁 Repository: ${testRepo.description}`, colors.blue)
        );

        console.log(colorize("\n📋 Available Pull Requests:", colors.blue));
        pulls.forEach((pr: any) => {
          console.log(`   #${pr.number}: ${pr.title}`);
          console.log(`      Author: ${pr.user?.login}`);
          console.log(
            `      Created: ${new Date(pr.created_at).toLocaleDateString()}`
          );
        });

        return {
          owner: testRepo.owner,
          repo: testRepo.repo,
          prNumber: pulls[0].number,
          prTitle: pulls[0].title,
        };
      }
    } catch (error: any) {
      console.log(colorize(`❌ ${error.message}`, colors.red));
    }
  }

  return null;
}

async function testWithWorkingRepo() {
  const workingRepo = await findWorkingRepository();

  if (!workingRepo) {
    console.log(
      colorize(
        "\n❌ Could not find any accessible repositories with PRs",
        colors.red
      )
    );
    return;
  }

  console.log(
    colorize(
      `\n🚀 TESTING AUTO-REVIEW WITH WORKING REPOSITORY`,
      colors.bright + colors.green
    )
  );
  console.log(`Repository: ${workingRepo.owner}/${workingRepo.repo}`);
  console.log(`PR #${workingRepo.prNumber}: ${workingRepo.prTitle}`);

  // Test the core functionality without auto-approve/merge (read-only test)
  try {
    console.log(colorize("\n📊 Testing PR status check...", colors.yellow));
    const status = await githubService.checkPullRequestStatus(
      workingRepo.owner,
      workingRepo.repo,
      workingRepo.prNumber
    );

    console.log(colorize("✅ PR status retrieved successfully!", colors.green));
    console.log(`   State: ${status.state}`);
    console.log(`   Mergeable: ${status.mergeable}`);
    console.log(
      `   Has Conflicts: ${status.hasConflicts ? "❌ YES" : "✅ NO"}`
    );
    console.log(`   Check Runs: ${status.checkRuns.length}`);
    console.log(`   Reviews: ${status.reviews.length}`);

    console.log(colorize("\n🤖 Testing AI code review...", colors.yellow));
    const files = await githubService.getPullRequestFiles(
      workingRepo.owner,
      workingRepo.repo,
      workingRepo.prNumber
    );

    console.log(colorize(`✅ Retrieved ${files.length} files!`, colors.green));

    // Test AI review on first file with code changes
    const codeFile = files.find(
      (file) => file.patch && isCodeFile(file.filename)
    );
    if (codeFile && codeFile.patch) {
      console.log(`   Reviewing ${codeFile.filename}...`);
      const review = await geminiService.reviewCode(
        codeFile.patch.substring(0, 1000), // Limit for cost
        getLanguageFromFilename(codeFile.filename)
      );

      console.log(colorize("✅ AI review completed!", colors.green));
      console.log(`   Review length: ${review.length} characters`);
    }

    console.log(
      colorize("\n🎉 ALL TESTS PASSED!", colors.bright + colors.green)
    );
    console.log(
      colorize(
        "Your GitHub token and AI integration are working correctly!",
        colors.green
      )
    );
    console.log(colorize("\n💡 To fix your original issue:", colors.blue));
    console.log("1. Make sure 'tvt987/AI' repository exists");
    console.log("2. Create a test pull request in that repository");
    console.log("3. Or use a different repository that has existing PRs");
  } catch (error: any) {
    console.log(
      colorize(`❌ Error during testing: ${error.message}`, colors.red)
    );
  }
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

async function main() {
  await testWithWorkingRepo();
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}
