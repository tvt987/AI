import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "your_openai_api_key_here",
    model: "gpt-4o-mini", // Cost-effective for learning
  },
  github: {
    token: process.env.GITHUB_TOKEN || "your_github_token_here",
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || "super-secret-abc123",
  },
  server: {
    port: parseInt(process.env.PORT || "3000"),
    environment: process.env.NODE_ENV || "development",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "your_gemini_api_key_here",
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    endpoint:
      process.env.GEMINI_ENDPOINT ||
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
  },
};

// Validate required environment variables
const requiredEnvVars = ["GITHUB_TOKEN", "GEMINI_API_KEY"];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingEnvVars.forEach((envVar) => {
    console.error(`   - ${envVar}`);
  });
  console.error("\n💡 Please create a .env file with these variables.");
  console.error("   See .env.example for template.");
  process.exit(1);
}
