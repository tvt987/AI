export const config = {
  openai: {
    apiKey:
      "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",
    model: "gpt-4o-mini", // Cost-effective for learning
  },
  github: {
    token: "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",
    webhookSecret: "super-secret-abc123",
  },
  server: {
    port: 3000,
    environment: "development",
  },
  gemini: {
    apiKey: "AIzaSyCDq7hDmpMQDehZciLyam6fOZ_kiZCcVdg",
    model: "gemini-2.0-flash",
    endpoint:
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
  },
};
