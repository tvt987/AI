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
}
