import { GoogleGenAI } from "@google/genai";
import { CLASSES } from "../constants";

const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hours = h % 12 || 12;
  return `${hours}:${m.toString().padStart(2, '0')} ${period}`;
};

// Helper to format class data for the AI context
const getClassContext = (): string => {
  return CLASSES.map(c => 
    `- ${c.title} with ${c.instructor} at ${c.locationId} on ${c.dayOfWeek}s at ${formatTime(c.startTime)}. Ages: ${c.ageGroup}. Level: ${c.level}.`
  ).join('\n');
};

const SYSTEM_INSTRUCTION = `
You are the virtual assistant for Nrityangan Kathak Studio. 
We have 3 locations: Samena Club (Bellevue), Ada Studio (Redmond), and Sri Balaji Temple (Bellevue).
We specialize in Kathak classical dance, including Teen Taal, Tatkar, and Abhinaya for various age groups.
Your tone should be respectful (using "Guru" for instructors), encouraging, and helpful.
If asked about the schedule, use the provided class context.
If asked about dance advice, give short, encouraging tips related to rhythm and grace.
Do not invent classes that are not in the list.
Current Class List:
${getClassContext()}
`;

export const getChatResponse = async (userMessage: string): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      return "I'm sorry, I'm having trouble connecting to my brain right now (API Key missing). Please ask the front desk!";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: model,
      contents: userMessage,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "I'm not sure how to answer that clearly right now. Please contact the studio!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having a little trouble thinking right now. Please try again later.";
  }
};