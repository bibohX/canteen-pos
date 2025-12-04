import { GoogleGenAI, Type } from "@google/genai";
import { Product, Transaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Helper to check API Key presence safely
const isApiKeyAvailable = (): boolean => {
  return !!process.env.API_KEY;
};

export const GeminiService = {
  // Admin: Analyze sales trends
  analyzeTransactions: async (transactions: Transaction[]) => {
    if (!isApiKeyAvailable()) return "API Key missing. Cannot generate insights.";

    // Limit transaction data to save tokens
    const recentTransactions = transactions.slice(0, 20).map(t => ({
        type: t.type,
        amount: t.totalAmount,
        items: t.items.map(i => i.product.name),
        date: t.timestamp
    }));

    const prompt = `
      Analyze these canteen transactions and provide 3 brief, actionable insights for the canteen manager.
      Focus on popular items, peak times (if discernable), or revenue trends.
      Keep it under 100 words.
      Data: ${JSON.stringify(recentTransactions)}
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Failed to generate insights.";
    }
  },

  // Student: Suggest a meal plan
  suggestMeal: async (products: Product[], budget: number) => {
    if (!isApiKeyAvailable()) return "API Key missing. Cannot suggest meals.";

    const productList = products.map(p => `${p.name} (₱${p.price})`).join(', ');
    const prompt = `
      I have a budget of ₱${budget}. Suggest a balanced meal combination (e.g., main + drink or snack) from this menu: ${productList}.
      Explain why it's a good choice in one sentence.
      Return JSON: { "suggestion": "string", "totalCost": number }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
             type: Type.OBJECT,
             properties: {
                suggestion: { type: Type.STRING },
                totalCost: { type: Type.NUMBER }
             }
          }
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("Gemini Error:", error);
      return null;
    }
  },

  // Admin: Generate description for new product
  generateProductDescription: async (productName: string, category: string) => {
    if (!isApiKeyAvailable()) return "Delicious and fresh.";

    const prompt = `Write a short, appetizing description (max 15 words) for a canteen item: ${productName} (Category: ${category}).`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Freshly prepared daily.";
    }
  }
};