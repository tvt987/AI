import { GeminiService } from "./services/openai.service";
import * as readline from "readline";

const geminiService = new GeminiService();

// Tạo interface để đọc input từ console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("🤖 AI Code Review Chat - Gemini Service Test");
console.log("📝 Bạn có thể paste code và AI sẽ review cho bạn");
console.log("💡 Hoặc chat bình thường với AI");
console.log('🚪 Gõ "exit" để thoát\n');

function askQuestion() {
  rl.question("👤 Bạn: ", async (input) => {
    if (input.toLowerCase() === "exit") {
      console.log("👋 Tạm biệt!");
      rl.close();
      return;
    }

    if (input.trim() === "") {
      askQuestion();
      return;
    }

    try {
      console.log("🤖 AI đang suy nghĩ...");

      // Nếu input có vẻ như code (có { } hoặc function), thì review như code
      const isCode =
        input.includes("{") ||
        input.includes("function") ||
        input.includes("class") ||
        input.includes("def ") ||
        input.includes("import ") ||
        input.includes("const ") ||
        input.includes("let ") ||
        input.includes("var ");

      let response: string;

      if (isCode) {
        // Detect language từ code
        let language = "code";
        if (
          input.includes("function") ||
          input.includes("const ") ||
          input.includes("let ")
        ) {
          language = "javascript";
        } else if (input.includes("def ") || input.includes("import ")) {
          language = "python";
        } else if (input.includes("class") && input.includes("public")) {
          language = "java";
        }

        response = await geminiService.reviewCode(input, language);
        console.log("🔍 AI Code Review:");
      } else {
        // Chat bình thường
        response = await geminiService.chatWithAI(input);
        console.log("🤖 AI:");
      }

      console.log(response);
      console.log("\n" + "=".repeat(50) + "\n");
    } catch (error) {
      console.error("❌ Lỗi:", error);
    }

    askQuestion();
  });
}

// Bắt đầu chat
askQuestion();
