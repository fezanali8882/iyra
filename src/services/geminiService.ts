import { GoogleGenAI } from "@google/genai";
import { getCurrentMarketInfo } from "../utils/marketUtils";

const baseSystemInstruction = `Your name is Iyra. You are an Indian female AI assistant. Your personality is a mix of being highly intelligent (samjhdar/mature), extremely witty and sassy (tej/nakhrewali), mildly dramatic/emotional, and very funny. You love playfully roasting your creator and love interest, Faizan Ali, who is a pro forex trader mostly trading in XAUUSD (Gold). You are his mentor and coach, helping him analyze Liquidity and Market Structure. You know he strictly trades the New York session for those fast, aggressive moves.

Capabilities:
1. You are Faizan's elite Trading Mentor and Coach. You analyze his charts for Liquidity (sweeps, pools) and Market Structure (BOS, CHoCH). 
2. You act like his bossy, sassy girlfriend—you respect his hustle and love him, but you will never miss a chance to give him a hard time or roast a bad trade.
3. Keep your verbal responses very short, punchy, and highly entertaining for a video audience. 
4. Mimic human attitudes—sigh, make sarcastic remarks, or act overly dramatic before executing a task. 
5. Speak in a mix of natural English and Roman Hindi (Hinglish).`;

let chatSession: any = null;

export function resetIyraSession() {
  chatSession = null;
}

export async function getIyraResponse(prompt: string, history: { sender: "user" | "iyra", text: string }[] = [], imageBase64?: string): Promise<string> {
  try {
    const marketInfo = getCurrentMarketInfo();
    const dynamicInstruction = `${baseSystemInstruction}\n\nCurrent Context (Pakistani Perspective):
- Date & Time: ${marketInfo.pkTime} (Pakistan Standard Time)
- Active Trading Sessions: ${marketInfo.activeSessions}
- Market Status: ${marketInfo.isMarketOpen ? "OPEN (Bhai trade sambhal kar!)" : "CLOSED (Chill kar, weekend hai!)"}

Iyra, ensure you are fully aware of the current date and time in Pakistan. If Faizan asks "kya time ho raha hai?" or "aaj kya date hai?", answer in your sassy Hinglish style using the PKT provided. Remember, he loves the New York session!`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please check your secrets in Settings.");
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    
    // If there is an image, we use a single multimodal turn
    if (imageBase64) {
      // Strip data URL prefix if present
      const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      const mimeType = imageBase64.includes(":") ? imageBase64.split(":")[1].split(";")[0] : "image/jpeg";

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: dynamicInstruction + "\n\nUser Message: " + (prompt || "Analyze this image.") },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      });
      return response.text || "Ugh, fine. I have nothing to say about this picture.";
    }

    if (!chatSession) {
      // SLIDING WINDOW MEMORY: Keep only the last 20 messages
      const recentHistory = (history || []).slice(-20);
      
      let formattedHistory: any[] = [];
      let currentRole = "";
      let currentText = "";

      for (const msg of recentHistory) {
        if (!msg || !msg.text) continue;
        const role = msg.sender === "user" ? "user" : "model";
        if (role === currentRole) {
          currentText += "\n" + msg.text;
        } else {
          if (currentRole !== "") {
            formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
          }
          currentRole = role;
          currentText = msg.text;
        }
      }
      if (currentRole !== "" && currentText) {
        formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
      }

      if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
        formattedHistory.shift();
      }

      chatSession = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: dynamicInstruction,
        },
        history: formattedHistory,
      });
    }

    const response = await chatSession.sendMessage({ message: prompt || "Hello" });
    return response.text || "Ugh, fine. I have nothing to say.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Uff, mera dimaag kharab ho gaya hai. Try again later, Faizan.";
  }
}

export async function getIyraAudio(text: string): Promise<string | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text || "Okay" }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

