import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../../logger";

export class GeminiEnhancer {
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
  }

  async enhancePrompt(text: string, keywords: string[]): Promise<string> {
    const prompt = `Create a descriptive video search prompt based on this scene: "${text}". Focus on: ${keywords.join(", ")}`;
    try {
      const result = await this.model.generateContent(prompt);
      const raw = result.response.text();
      return raw.replace(/\*/g, "").trim();
    } catch (err) {
      logger.error(err, "Failed to enhance prompt with Gemini");
      return keywords.join(" "); // fallback
    }
  }
}
