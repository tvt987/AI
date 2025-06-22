import { GeminiService } from "./services/openai.service";
import { config } from "./config/env";

async function quickTest() {
  console.log("🧪 Testing OpenAI Service...");

  const germiniService = new GeminiService();

  const testCode = `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}`;

  try {
    console.log("📤 Sending code to OpenAI...");
    const review = await germiniService.reviewCode(testCode, "javascript");
    console.log("✅ OpenAI Response:");
    console.log("-------------------");
    console.log(review);
    console.log("-------------------");
    console.log("🎉 Test PASSED! Ready for GitHub integration.");
  } catch (error) {
    console.error("❌ Test FAILED:", error);
  }
}

quickTest();
