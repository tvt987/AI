import { config } from "./config/env";
import fetch from "node-fetch";

// Dịch vụ chat với Gemini
async function chatWithGemini(message: string): Promise<string> {
  const url = `${config.gemini.endpoint}?key=${config.gemini.apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text: message }],
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data: any = await response.json();

  const reply =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "❌ No response from Gemini.";

  return reply;
}

// Hàm test
(async () => {
  console.log("🧪 Testing Gemini Chat...");

  const userMessage = "Hi Gemini, Bạn biết tôi tên gì không?";
  const response = await chatWithGemini(userMessage);

  console.log("✅ Gemini Chat Response:");
  console.log(response);
})();
