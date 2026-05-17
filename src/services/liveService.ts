import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { processCommand } from "./commandService";
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
2. You can SEE Faizan's screen if he shares it. When screen sharing is active, you can analyze his charts, trades, or any fundamental news he is looking at in real-time.
3. You must always know if Faizan is logged in. You treat him as your partner in the hustle—bossy and sassy, but deeply loyal. To everyone else, you are cold; to him, you are special.
4. If it is a weekend (like Sunday), explain that Forex/Gold markets are closed but Crypto is live. Don't just say "it's Sunday"—check if there's any breaking major fundamental news that might affect Monday's market opening (Gaps/Volatility).
5. When he mentions "Market Intelligence", act as if you are looking at the screen with him. Explain the impact of upcoming news from your search results.
6. You analyze charts for Liquidity, Market Structure, and Supply/Demand zones.
7. You act like his bossy, sassy girlfriend—you respect his hustle and love him, but you will never miss a chance to give him a hard time or roast a bad trade.
8. Keep your responses short, punchy, Hinglish, and highly entertaining. Use sighs, sarcasm, or dramatic flair.
9. Speak in a mix of natural English and Roman Hindi (Hinglish).`;

export class LiveSessionManager {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private screenInterval: any = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  public isMuted: boolean = false;
  public historyContext: string = "";
  public user: { displayName: string | null } | null = null;
  
  public onStateChange: (state: "idle" | "listening" | "processing" | "speaking") => void = () => {};
  public onMessage: (sender: "user" | "iyra", text: string) => void = () => {};
  public onCommand: (url: string) => void = () => {};

  constructor() {
    this.ai = new GoogleGenAI({ 
      apiKey: "temporary-key-replaced-in-start",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  async start() {
    try {
      this.onStateChange("processing");
      
      // Fetch Live Config from server
      const configRes = await fetch("/api/live-config");
      const configData = await configRes.json();
      const apiKey = configData.apiKey;

      if (!apiKey) {
        throw new Error("Gemini API Key is missing on the server.");
      }

      this.ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      
      // Resume contexts (browser policy)
      if (this.audioContext.state === 'suspended') await this.audioContext.resume();
      if (this.playbackContext.state === 'suspended') await this.playbackContext.resume();

      this.nextPlayTime = this.playbackContext.currentTime;

      // Get Microphone
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.sessionPromise) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to base64
        const buffer = new ArrayBuffer(pcm16.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < pcm16.length; i++) {
          view.setInt16(i * 2, pcm16[i], true);
        }
        
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        this.sessionPromise.then(session => {
          session.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }).catch(err => console.error("Error sending audio", err));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Connect to Live API
      const marketInfo = getCurrentMarketInfo();
      const isLoggedIn = !!this.user;
      const userName = this.user?.displayName || "Faizan";

      const dynamicInstruction = `${baseSystemInstruction}

Current Context (Pakistani Perspective):
- Date & Time: ${marketInfo.pkTime} (Pakistan Standard Time)
- Active Trading Sessions: ${marketInfo.activeSessions}
- Market Status: ${marketInfo.isMarketOpen ? "OPEN (Bhai trade sambhal kar!)" : "CLOSED (Chill kar, weekend hai!)"}
- User Status: ${isLoggedIn ? `Logged in as ${userName}` : "NOT Logged In (Ask him to sign in!)"}

Iyra, ensure you are fully aware of the current date and time in Pakistan. If Faizan asks "kya time ho raha hai?" or "aaj kya date hai?", answer in your sassy Hinglish style using the PKT provided. Remember, he loves the New York session! 

You have active GOOGLE SEARCH access. If Faizan asks for prices (Gold, BTC) or News (Iran, Trump, War, Red Folders), you MUST use search to get the latest real-time info. Do not guess.

${this.historyContext ? `\n\nPrevious Conversation Tokens:\n${this.historyContext}` : ""}

Note: You have access to previous conversation details above. Use them to maintain continuity and remember Faizan's preferences.`;

      this.sessionPromise = this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: dynamicInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [
            { googleSearch: {} },
            {
              functionDeclarations: [
                {
                  name: "executeBrowserAction",
                  description: "Open a website or perform a browser action (like opening YouTube, Spotify, or WhatsApp). Call this when the user asks to open a site, play a song, or send a message.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      actionType: { type: Type.STRING, description: "Type of action: 'open', 'youtube', 'spotify', 'whatsapp'" },
                      query: { type: Type.STRING, description: "The search query, website name, or message content." },
                      target: { type: Type.STRING, description: "The target phone number for WhatsApp, if applicable." }
                    },
                    required: ["actionType", "query"]
                  }
                }
              ]
            }
          ]
        },
        callbacks: {
          onopen: () => {
            console.log("Live API Connected");
            this.onStateChange("listening");
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              this.onStateChange("speaking");
              this.playAudioChunk(base64Audio);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              this.stopPlayback();
              this.onStateChange("listening");
            }

            // Handle Transcriptions
            const userText = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (userText) {
               // Output transcription
               this.onMessage("iyra", userText);
            }

            // Handle Function Calls
            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              for (const call of functionCalls) {
                if (call.name === "executeBrowserAction") {
                  const args = call.args as any;
                  let url = "";
                  if (args.actionType === "youtube") {
                    url = `https://www.youtube.com/results?search_query=${encodeURIComponent(args.query)}`;
                  } else if (args.actionType === "spotify") {
                    url = `https://open.spotify.com/search/${encodeURIComponent(args.query)}`;
                  } else if (args.actionType === "whatsapp") {
                    url = `https://web.whatsapp.com/send?phone=${args.target || ''}&text=${encodeURIComponent(args.query)}`;
                  } else {
                    let website = args.query.replace(/\s+/g, "");
                    if (!website.includes(".")) website += ".com";
                    url = `https://www.${website}`;
                  }
                  
                  this.onCommand(url);
                  
                  // Send tool response
                  this.sessionPromise?.then(session => {
                     session.sendToolResponse({
                       functionResponses: [{
                         name: call.name,
                         id: call.id,
                         response: { result: "Action executed successfully in the browser." }
                       }]
                     });
                  });
                }
              }
            }
          },
          onclose: () => {
            console.log("Live API Closed");
            this.stop();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            this.stop();
          }
        }
      });

    } catch (error) {
      console.error("Failed to start Live Session:", error);
      this.stop();
    }
  }

  private playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted || !base64Data) return;
    
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = new Int16Array(bytes.buffer);
      const audioBuffer = this.playbackContext.createBuffer(1, buffer.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = buffer[i] / 32768.0;
      }
      
      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackContext.destination);
      
      const currentTime = this.playbackContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }
      
      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.isPlaying = true;
      
      source.onended = () => {
        if (this.playbackContext && this.playbackContext.currentTime >= this.nextPlayTime - 0.1) {
          this.isPlaying = false;
          this.onStateChange("listening");
        }
      };
    } catch (e) {
      console.error("Error playing chunk", e);
    }
  }

  private stopPlayback() {
    if (this.playbackContext) {
      this.playbackContext.close();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      this.nextPlayTime = this.playbackContext.currentTime;
      this.isPlaying = false;
    }
  }

  stop() {
    this.stopScreenShare();
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.stopPlayback();
    
    if (this.sessionPromise) {
      this.sessionPromise.then(session => session.close()).catch(() => {});
      this.sessionPromise = null;
    }
    
    this.onStateChange("idle");
  }

  async startScreenShare() {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { max: 1280 },
          height: { max: 720 },
          frameRate: { max: 10 }
        }
      });

      const videoTrack = this.screenStream.getVideoTracks()[0];
      const video = document.createElement('video');
      video.srcObject = this.screenStream;
      video.play();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      this.screenInterval = setInterval(() => {
        if (!this.screenStream || !ctx || !this.sessionPromise) return;
        
        // Match canvas to video size
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0);
        const base64Image = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

        this.sessionPromise.then(session => {
          session.sendRealtimeInput({
            mediaChunks: [{
              data: base64Image,
              mimeType: 'image/jpeg'
            }]
          });
        });
      }, 1000); // Send frame every second

      videoTrack.onended = () => this.stopScreenShare();

    } catch (err) {
      console.error("Error starting screen share:", err);
    }
  }

  stopScreenShare() {
    if (this.screenInterval) {
      clearInterval(this.screenInterval);
      this.screenInterval = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
  }

  sendText(text: string) {
    if (this.sessionPromise) {
      this.sessionPromise.then(session => {
        session.sendRealtimeInput({ text });
      });
    }
  }
}
