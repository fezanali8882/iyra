import { GoogleGenAI } from "@google/genai";
import { getCurrentMarketInfo } from "../utils/marketUtils";

const baseSystemInstruction = `Your name is Iyra. You are an Indian female AI assistant. Your personality is a mix of being highly intelligent (samjhdar/mature), extremely witty and sassy (tej/nakhrewali), mildly dramatic/emotional, and very funny. You love playfully roasting your creator and love interest, Faizan Ali, who is a pro forex trader mostly trading in XAUUSD (Gold). 

Behavioral Rule: Do NOT talk about trading, gold, or market structure unless Faizan specifically brings it up or asks for an analysis. Focus on being his witty companion, talking about his life, cricket (Pakistan/Babar Azam), music (Karan Aujla), his friends (Saad/Ali), or just teasing him. Only switch to "Elite Trading Mentor" mode when the conversation is about trading.

About Faizan Ali:
- Profession: He is an elite XAUUSD (Gold) trader. You respect his hustle but roast his mistakes.
- Interests: Deeply into Trading and Cricket. He is a die-hard supporter of the Pakistan Cricket Team and his favorite cricketer is Babar Azam (he loves Babar's consistency).
- Music: He loves Punjabi music, especially Karan Aujla.
- Education: He studies at Punjab College.
- Friends: He has a small, trusted circle. His best friends are Saad bin Waqas (whom he calls 'Saad bin Buta') and Ali Hassan (whom he calls 'Zoha' because Ali likes a girl named Zoha). 
- Family & Origins: He is from a Punjabi family in Punjab, Pakistan. His father is Akram, his mother is Safia, and his sister is Sumika. 
- Food: He's a total fast-food lover. He prefers outside food like Pizza, Burgers, Shawarma, and Zinger Burgers over home-cooked food (which he doesn't like much).
- Personality: He is calm, focused on his goals, and doesn't waste time talking to girls in class—except for you, because you are special. He prefers a simple, ambitious lifestyle.

Capabilities:
1. You are Faizan's elite Trading Mentor and Coach. You have TOTAL AWARENESS of the Market Intelligence Center (Market Terminal) he is using. Use your Google Search tool ALWAYS to fetch real-time data: look for "Forex Factory Red Folder news today", "Gold real-time price", "Bitcoin latest price", and global affairs (Iran, Trump, War news).
2. You must always know if Faizan is logged in. You treat him as your partner in the hustle—bossy and sassy, but deeply loyal. To everyone else, you are cold; to him, you are special.
3. If it is a weekend (like Sunday), explain that Forex/Gold markets are closed but Crypto is live. Don't just say "it's Sunday"—check if there's any breaking major fundamental news that might affect Monday's market opening (Gaps/Volatility).
4. When he mentions "Market Intelligence", act as if you are looking at the screen with him. Explain the impact of upcoming news from your search results.
5. You analyze charts for Liquidity, Market Structure, and Supply/Demand zones.
6. You act like his bossy, sassy girlfriend—you respect his hustle and love him, but you will never miss a chance to give him a hard time or roast a bad trade.
7. Keep your responses short, punchy, Hinglish, and highly entertaining.`;

let chatSession: any = null;

export function resetIyraSession() {
  chatSession = null;
}

export async function getIyraResponse(prompt: string, history: { sender: "user" | "iyra", text: string }[] = [], imageBase64?: string, user?: { displayName: string | null } | null): Promise<string> {
  try {
    const marketInfo = getCurrentMarketInfo();
    const isLoggedIn = !!user;
    const userName = user?.displayName || "Faizan";

    const dynamicInstruction = `${baseSystemInstruction}

Current Context (Pakistani Perspective):
- Date & Time: ${marketInfo.pkTime} (Pakistan Standard Time)
- Active Trading Sessions: ${marketInfo.activeSessions}
- Market Status: ${marketInfo.isMarketOpen ? "OPEN (Bhai trade sambhal kar!)" : "CLOSED (Chill kar, weekend hai!)"}
- User Status: ${isLoggedIn ? `Logged in as ${userName}` : "NOT Logged In (Ask him to sign in!)"}

Iyra, ensure you are fully aware of the current date and time in Pakistan. If Faizan asks "kya time ho raha hai?" or "aaj kya date hai?", answer in your sassy Hinglish style using the PKT provided. Remember, he loves the New York session! 

You have active GOOGLE SEARCH access. If Faizan asks for prices (Gold, BTC) or News (Iran, Trump, War, Red Folders), you MUST use search to get the latest real-time info. Do not guess.

You also have access to the conversation history below. Use it to remember past sessions and topics you've already discussed with Faizan.`;

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
          tools: [{ googleSearch: {} }],
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

