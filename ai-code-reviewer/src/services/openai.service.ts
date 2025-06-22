// import OpenAI from "openai";
// import { config } from "../config/env";

// export class OpenAIService {
//   private openai: OpenAI;

//   constructor() {
//     this.openai = new OpenAI({
//       apiKey: config.openai.apiKey,
//     });
//   }

//   async reviewCode(code: string, language: string): Promise<string> {
//     const prompt = `
//     Please review this ${language} code and provide:
//     1. Code quality assessment (1-10)
//     2. Potential bugs or issues
//     3. Performance improvements
//     4. Best practices suggestions
//     5. Security concerns (if any)

//     Code:
//     \`\`\`${language}
//     ${code}
//     \`\`\`
//     `;

//     const response = await this.openai.chat.completions.create({
//       model: config.gemini.model,
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.3,
//       max_tokens: 1000,
//     });

//     return response.choices[0].message.content || "No review available";
//   }
// }

import { config } from "../config/env";
import fetch from "node-fetch";

export class GeminiService {
  private apiKey = config.gemini.apiKey;
  private endpoint = config.gemini.endpoint;

  async reviewCode(code: string, language: string): Promise<string> {
    const prompt = `
Please review this ${language} code and provide:
1. Code quality assessment (1-10)
2. Potential bugs or issues
3. Performance improvements
4. Best practices suggestions
5. Security concerns (if any)

Code:
\`\`\`${language}
${code}
\`\`\`
    `;

    const url = `${this.endpoint}?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    interface GeminiResponse {
      candidates?: {
        content?: {
          parts?: {
            text?: string;
          }[];
        };
      }[];
    }

    const data = (await response.json()) as GeminiResponse;

    const result =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "No review returned by Gemini.";

    return result;
  }

  async chatWithAI(message: string): Promise<string> {
    const url = `${this.endpoint}?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            {
              text: message,
            },
          ],
        },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    interface GeminiResponse {
      candidates?: {
        content?: {
          parts?: {
            text?: string;
          }[];
        };
      }[];
    }

    const data = (await response.json()) as GeminiResponse;

    const result =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "No response returned by Gemini.";

    return result;
  }
}
