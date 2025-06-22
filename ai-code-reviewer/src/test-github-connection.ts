import { GitHubService } from "./services/github-service";

const githubService = new GitHubService();

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

async function testGitHubConnection() {
  console.log(
    colorize("🔍 GITHUB CONNECTION DIAGNOSTICS", colors.bright + colors.cyan)
  );

  try {
    // Test 1: Authentication
    console.log(colorize("\n1️⃣ Testing authentication...", colors.yellow));
    const user = await githubService.getCurrentUser();
    console.log(colorize(`✅ Authentication successful!`, colors.green));
    console.log(`   Username: ${user.login}`);
    console.log(`   Name: ${user.name}`);

    // Test 2: List user repositories
    console.log(colorize("\n2️⃣ Listing your repositories...", colors.yellow));
    const repos = await githubService.getUserRepos();
    console.log(
      colorize(`✅ Found ${repos.length} repositories`, colors.green)
    );

    if (repos.length > 0) {
      console.log(colorize("\n📁 Your repositories:", colors.blue));
      repos.slice(0, 10).forEach((repo) => {
        console.log(
          `   - ${repo.full_name} ${repo.private ? "(private)" : "(public)"}`
        );
      });
      if (repos.length > 10) {
        console.log(`   ... and ${repos.length - 10} more`);
      }
    }

    // Test 3: Check specific repository
    console.log(
      colorize("\n3️⃣ Testing access to 'tvt987/AI'...", colors.yellow)
    );
    try {
      const repoInfo = await githubService.getRepositoryInfo("tvt987", "AI");
      console.log(colorize(`✅ Repository access successful!`, colors.green));
      console.log(`   Full name: ${repoInfo.full_name}`);
      console.log(
        `   Description: ${repoInfo.description || "No description"}`
      );
      console.log(`   Language: ${repoInfo.language || "Not specified"}`);
      console.log(`   Stars: ${repoInfo.stars}`);

      // Test 4: List pull requests
      console.log(
        colorize("\n4️⃣ Checking pull requests in 'tvt987/AI'...", colors.yellow)
      );
      try {
        // We'll call the Octokit API directly since we don't have a method for listing PRs
        const octokit = (githubService as any).octokit;
        const { data: pulls } = await octokit.rest.pulls.list({
          owner: "tvt987",
          repo: "AI",
          state: "all",
        });

        console.log(
          colorize(`✅ Found ${pulls.length} pull requests`, colors.green)
        );
        if (pulls.length > 0) {
          console.log(colorize("\n📋 Pull Requests:", colors.blue));
          pulls.forEach((pr: any) => {
            console.log(`   #${pr.number}: ${pr.title} (${pr.state})`);
          });
        } else {
          console.log(
            colorize(
              "   No pull requests found in this repository",
              colors.yellow
            )
          );
        }

        // Test 5: Try to access PR #1 specifically
        console.log(colorize("\n5️⃣ Testing access to PR #1...", colors.yellow));
        try {
          const { data: pr } = await octokit.rest.pulls.get({
            owner: "tvt987",
            repo: "AI",
            pull_number: 1,
          });
          console.log(colorize(`✅ PR #1 found!`, colors.green));
          console.log(`   Title: ${pr.title}`);
          console.log(`   State: ${pr.state}`);
          console.log(`   Author: ${pr.user?.login}`);
        } catch (error: any) {
          console.log(
            colorize(`❌ PR #1 not found: ${error.message}`, colors.red)
          );
          console.log(
            colorize(
              "   This explains the 404 error in auto-review!",
              colors.yellow
            )
          );
        }
      } catch (error: any) {
        console.log(
          colorize(
            `❌ Error listing pull requests: ${error.message}`,
            colors.red
          )
        );
      }
    } catch (error: any) {
      console.log(
        colorize(`❌ Repository access failed: ${error.message}`, colors.red)
      );
      console.log(colorize("   Possible causes:", colors.yellow));
      console.log("   - Repository doesn't exist");
      console.log("   - Repository is private and token lacks access");
      console.log("   - Repository name is misspelled");
    }
  } catch (error: any) {
    console.log(
      colorize(`❌ Authentication failed: ${error.message}`, colors.red)
    );
    console.log(
      colorize(
        "   Please check your GitHub token in config/env.ts",
        colors.yellow
      )
    );
  }
}

// Test with different repository if needed
async function testRepository(owner: string, repo: string) {
  console.log(
    colorize(`\n🔍 Testing repository: ${owner}/${repo}`, colors.cyan)
  );

  try {
    const repoInfo = await githubService.getRepositoryInfo(owner, repo);
    console.log(colorize(`✅ Repository accessible`, colors.green));

    const octokit = (githubService as any).octokit;
    const { data: pulls } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "all",
    });

    console.log(`   Pull requests: ${pulls.length}`);
    if (pulls.length > 0) {
      pulls.slice(0, 5).forEach((pr: any) => {
        console.log(`   #${pr.number}: ${pr.title} (${pr.state})`);
      });
    }

    return { accessible: true, pullCount: pulls.length };
  } catch (error: any) {
    console.log(colorize(`❌ ${error.message}`, colors.red));
    return { accessible: false, error: error.message };
  }
}

async function main() {
  await testGitHubConnection();

  console.log(colorize("\n💡 RECOMMENDATIONS:", colors.bright + colors.blue));
  console.log(
    "1. If 'tvt987/AI' doesn't exist, create it or use a different repository"
  );
  console.log("2. If no PRs exist, create a test PR first");
  console.log("3. You can test with any public repository that has PRs");
  console.log(
    "4. Example: Try 'microsoft/vscode' (owner: microsoft, repo: vscode)"
  );

  console.log(colorize("\n🚀 Next steps:", colors.green));
  console.log("- Run: npm run test-connection");
  console.log("- Create a test PR in your repository");
  console.log("- Or test with a different repository");

  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

export { testRepository };
