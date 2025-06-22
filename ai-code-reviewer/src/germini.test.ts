// tests/gemini.test.ts

import { describe, beforeEach, it } from "node:test";
import { GeminiService } from "./services/openai.service";

describe("Gemini Service", () => {
  let service: GeminiService;

  beforeEach(() => {
    service = new GeminiService();
  });

  it("should review JavaScript code", { timeout: 30000 }, async () => {
    const code = `
        function add(a, b) {
            return a + b;
        }
        `;

    const review = await service.reviewCode(code, "javascript");
    expect(review.toLowerCase()).toContain("code quality");
  }); // Timeout tăng lên 30s để chờ phản hồi từ API
});

// Minimal expect implementation for demonstration purposes
function expect(received: string) {
  return {
    toContain(expected: string) {
      if (!received.includes(expected)) {
        throw new Error(`Expected "${received}" to contain "${expected}"`);
      }
    },
  };
}
