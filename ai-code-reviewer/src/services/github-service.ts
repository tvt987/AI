import { Octokit } from "@octokit/rest";
import { config } from "../config/env";

export class GitHubService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: config.github.token,
    });
  }

  // ========== PULL REQUEST METHODS ==========
  async getPullRequestFiles(owner: string, repo: string, pullNumber: number) {
    const { data } = await this.octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return data.map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch,
      blob_url: file.blob_url,
      raw_url: file.raw_url,
    }));
  }

  async previewPullRequestChanges(
    owner: string,
    repo: string,
    pullNumber: number
  ) {
    const files = await this.getPullRequestFiles(owner, repo, pullNumber);

    return files.map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: this.parsePatchToChanges(file.patch || ""),
      language: this.detectLanguage(file.filename),
    }));
  }

  private parsePatchToChanges(patch: string) {
    if (!patch) return { added: [], removed: [], context: [] };

    const lines = patch.split("\n");
    const changes = {
      added: [] as Array<{ line: number; content: string }>,
      removed: [] as Array<{ line: number; content: string }>,
      context: [] as Array<{ line: number; content: string }>,
    };

    let currentLine = 0;
    let inHunk = false;

    for (const line of lines) {
      if (line.startsWith("@@")) {
        // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          currentLine = parseInt(match[2]) - 1; // New line start
          inHunk = true;
        }
        continue;
      }

      if (!inHunk) continue;

      if (line.startsWith("+") && !line.startsWith("+++")) {
        currentLine++;
        changes.added.push({
          line: currentLine,
          content: line.substring(1), // Remove + prefix
        });
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        changes.removed.push({
          line: currentLine,
          content: line.substring(1), // Remove - prefix
        });
      } else if (line.startsWith(" ")) {
        currentLine++;
        changes.context.push({
          line: currentLine,
          content: line.substring(1), // Remove space prefix
        });
      }
    }

    return changes;
  }

  private detectLanguage(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const languageMap: { [key: string]: string } = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      go: "go",
      rs: "rust",
      php: "php",
      rb: "ruby",
      swift: "swift",
      kt: "kotlin",
      scala: "scala",
      html: "html",
      css: "css",
      scss: "scss",
      sass: "sass",
      less: "less",
      json: "json",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
      md: "markdown",
      sql: "sql",
      sh: "bash",
      bash: "bash",
      zsh: "bash",
      fish: "bash",
    };

    return languageMap[ext] || "text";
  }

  async getPullRequestInfo(owner: string, repo: string, pullNumber: number) {
    const { data } = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return {
      title: data.title,
      body: data.body,
      state: data.state,
      author: data.user?.login,
      created_at: data.created_at,
      updated_at: data.updated_at,
      commits: data.commits,
      additions: data.additions,
      deletions: data.deletions,
      changed_files: data.changed_files,
    };
  }

  async createReviewComment(
    owner: string,
    repo: string,
    pullNumber: number,
    body: string
  ) {
    return await this.octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      body,
      event: "COMMENT",
    });
  }

  async createLineComment(
    owner: string,
    repo: string,
    pullNumber: number,
    body: string,
    commitSha: string,
    path: string,
    line: number
  ) {
    return await this.octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number: pullNumber,
      body,
      commit_id: commitSha,
      path,
      line,
    });
  }

  // ========== REPOSITORY METHODS ==========
  async getRepositoryInfo(owner: string, repo: string) {
    const { data } = await this.octokit.rest.repos.get({
      owner,
      repo,
    });

    return {
      name: data.name,
      full_name: data.full_name,
      description: data.description,
      language: data.language,
      stars: data.stargazers_count,
      forks: data.forks_count,
      open_issues: data.open_issues_count,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ) {
    const { data } = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if ("content" in data) {
      return {
        content: Buffer.from(data.content, "base64").toString("utf8"),
        sha: data.sha,
        size: data.size,
      };
    }
    return null;
  }

  // ========== ISSUES METHODS ==========
  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
    labels?: string[]
  ) {
    return await this.octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
    });
  }

  async getIssues(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open"
  ) {
    const { data } = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state,
    });

    return data.map((issue) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      author: issue.user?.login,
      labels: issue.labels.map((label) =>
        typeof label === "string" ? label : label.name
      ),
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    }));
  }

  // ========== COMMITS METHODS ==========
  async getCommits(
    owner: string,
    repo: string,
    since?: string,
    until?: string
  ) {
    const { data } = await this.octokit.rest.repos.listCommits({
      owner,
      repo,
      since,
      until,
    });

    return data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name,
      date: commit.commit.author?.date,
      url: commit.html_url,
    }));
  }

  async getCommitDiff(owner: string, repo: string, sha: string) {
    const { data } = await this.octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });

    return {
      sha: data.sha,
      message: data.commit.message,
      author: data.commit.author?.name,
      files:
        data.files?.map((file) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          patch: file.patch,
        })) || [],
    };
  }

  // ========== USER METHODS ==========
  async getCurrentUser() {
    const { data } = await this.octokit.rest.users.getAuthenticated();
    return {
      login: data.login,
      name: data.name,
      email: data.email,
      avatar_url: data.avatar_url,
    };
  }

  async getUserRepos(username?: string) {
    const { data } = username
      ? await this.octokit.rest.repos.listForUser({ username })
      : await this.octokit.rest.repos.listForAuthenticatedUser();

    return data.map((repo) => ({
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      private: repo.private,
      updated_at: repo.updated_at,
    }));
  }

  // NEW: Check PR status và conflicts
  async checkPullRequestStatus(
    owner: string,
    repo: string,
    pullNumber: number
  ) {
    const { data } = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    // Check merge status
    const mergeableState = data.mergeable_state; // 'clean', 'dirty', 'unstable', 'blocked', etc.
    const mergeable = data.mergeable; // true/false/null

    // Get check runs for the latest commit
    const checkRuns = await this.getCheckRuns(owner, repo, data.head.sha);

    // Get PR reviews
    const reviews = await this.getPullRequestReviews(owner, repo, pullNumber);

    return {
      mergeable,
      mergeableState,
      hasConflicts: mergeable === false,
      state: data.state, // 'open', 'closed'
      merged: data.merged,
      checkRuns,
      reviews,
      head: {
        sha: data.head.sha,
        ref: data.head.ref,
      },
      base: {
        sha: data.base.sha,
        ref: data.base.ref,
      },
    };
  }

  // NEW: Get check runs (CI/CD status)
  async getCheckRuns(owner: string, repo: string, sha: string) {
    try {
      const { data } = await this.octokit.rest.checks.listForRef({
        owner,
        repo,
        ref: sha,
      });

      return data.check_runs.map((run) => ({
        name: run.name,
        status: run.status, // 'queued', 'in_progress', 'completed'
        conclusion: run.conclusion, // 'success', 'failure', 'neutral', 'cancelled', 'timed_out', 'action_required'
        url: run.html_url,
        started_at: run.started_at,
        completed_at: run.completed_at,
      }));
    } catch (error) {
      // Nếu không có check runs thì return empty array
      return [];
    }
  }

  // NEW: Get PR reviews
  async getPullRequestReviews(owner: string, repo: string, pullNumber: number) {
    const { data } = await this.octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return data.map((review) => ({
      user: review.user?.login,
      state: review.state, // 'APPROVED', 'REQUEST_CHANGES', 'COMMENTED'
      body: review.body,
      submitted_at: review.submitted_at,
    }));
  }

  // NEW: Approve pull request
  async approvePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    message?: string
  ) {
    return await this.octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      event: "APPROVE",
      body:
        message ||
        "✅ Automatically approved - No conflicts or errors detected!",
    });
  }

  // NEW: Request changes
  async requestChanges(
    owner: string,
    repo: string,
    pullNumber: number,
    message: string
  ) {
    return await this.octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      event: "REQUEST_CHANGES",
      body: message,
    });
  }

  // NEW: Merge pull request
  async mergePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    options?: {
      commitTitle?: string;
      commitMessage?: string;
      mergeMethod?: "merge" | "squash" | "rebase";
    }
  ) {
    const mergeMethod = options?.mergeMethod || "merge";

    return await this.octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: pullNumber,
      commit_title: options?.commitTitle,
      commit_message: options?.commitMessage,
      merge_method: mergeMethod,
    });
  }

  // NEW: Create status comment
  async createStatusComment(
    owner: string,
    repo: string,
    pullNumber: number,
    status: {
      hasConflicts: boolean;
      hasErrors: boolean;
      checksPassed: boolean;
      approved: boolean;
      details: string;
    }
  ) {
    const { hasConflicts, hasErrors, checksPassed, approved, details } = status;

    let emoji = "";
    let statusText = "";
    let actions = "";

    if (hasConflicts) {
      emoji = "⚠️";
      statusText = "CONFLICTS DETECTED";
      actions =
        "🔧 **Action Required:** Please resolve merge conflicts before proceeding.";
    } else if (hasErrors) {
      emoji = "❌";
      statusText = "ERRORS DETECTED";
      actions =
        "🐛 **Action Required:** Please fix the errors in CI/CD checks.";
    } else if (!checksPassed) {
      emoji = "🔄";
      statusText = "CHECKS PENDING";
      actions = "⏳ **Waiting:** CI/CD checks are still running.";
    } else if (approved && checksPassed) {
      emoji = "✅";
      statusText = "READY TO MERGE";
      actions = "🚀 **Success:** All checks passed! PR can be merged safely.";
    } else {
      emoji = "📋";
      statusText = "REVIEW REQUIRED";
      actions = "👀 **Action Required:** Waiting for code review approval.";
    }

    const message = `
${emoji} **${statusText}**

${actions}

**Details:**
${details}

---
*🤖 Automated status check by AI Code Reviewer*
    `.trim();

    return await this.createReviewComment(owner, repo, pullNumber, message);
  }
}
