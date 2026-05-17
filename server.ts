import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, history, imageBase64, systemInstruction } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.error("GEMINI_API_KEY is not set on the server.");
        return res.status(500).json({ error: "Gemini API Key not configured on server. Please add it to environment variables." });
      }

      const client = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      console.log("Chat request received. Prompt length:", prompt?.length);

      const contents: any[] = (history || []).map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

      const currentParts: any[] = [{ text: prompt || "Analyze this." }];
      if (imageBase64) {
        const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
        const mimeType = imageBase64.includes(":") ? imageBase64.split(":")[1].split(";")[0] : "image/jpeg";
        currentParts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }

      const result = await client.models.generateContent({
        model: "gemini-1.5-flash",
        systemInstruction,
        contents: [...contents.slice(-10), { role: "user", parts: currentParts }],
        config: {
          tools: [{ googleSearch: {} }]
        }
      } as any);

      res.json({ text: result.text || "I have nothing much to say about this." });
    } catch (error: any) {
      console.error("Gemini Chat API Error:", error);
      res.status(500).json({ error: "Gemini API Error: " + error.message });
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const { text } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) return res.status(500).json({ error: "Missing API Key" });

      const client = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const result = await client.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }
          }
        }
      });

      const audioData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      res.json({ audio: audioData });
    } catch (error: any) {
      console.error("Gemini TTS API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Proxy for getting Live API Config
  app.get("/api/live-config", (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("API Key request failed: GEMINI_API_KEY not set.");
      return res.status(500).json({ error: "API Key not configured" });
    }
    res.json({ apiKey });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
