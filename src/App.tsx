import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, ImagePlus, X, Plus } from "lucide-react";
import { getIyraResponse, getIyraAudio, resetIyraSession } from "./services/geminiService";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import { signIn, signOutUser, auth, User, db } from "./lib/firebase";
import { saveMessage, loadHistory, clearUserHistory, ChatMessage as HistoryMessage } from "./services/historyService";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDocFromServer, setDoc } from "firebase/firestore";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import AuthModal from "./components/AuthModal";
import MarketDashboard from "./components/market/MarketDashboard";
import Diagnostics from "./components/Diagnostics";
import { playPCM } from "./utils/audioUtils";
import { motion, AnimatePresence } from "motion/react";
import { TrendingUp, Settings } from "lucide-react";

type AppState = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  id: string;
  sender: "user" | "iyra";
  text: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string>(Date.now().toString());
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMarketDashboardOpen, setIsMarketDashboardOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [appState, setAppState] = useState<AppState>("idle");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        setIsDiagnosticsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Ensure user document exists in Firestore (critical for Google login sync)
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDocFromServer(userDocRef).catch(() => null);
          
          if (!userSnap || !userSnap.exists()) {
            await setDoc(userDocRef, {
              displayName: currentUser.displayName || 'Anonymous',
              email: currentUser.email || '',
              ownerId: currentUser.uid,
              createdAt: new Date().toISOString()
            }, { merge: true });
          }
        } catch (e) {
          console.error("Error ensuring user profile:", e);
        }

        const history = await loadHistory(currentUser.uid);
        if (history.length > 0) {
          setMessages(history.map(m => ({ id: m.id, sender: m.sender, text: m.text })));
        }
      } else {
        setMessages([]);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
    }
  }, [isMuted]);

  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<"connecting" | "online" | "offline">("connecting");

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) setServerStatus("online");
        else setServerStatus("offline");
      } catch (e) {
        setServerStatus("offline");
      }
    };
    checkStatus();
  }, []);

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, appState]);

  const handleTextCommand = useCallback(async (finalTranscript: string) => {
    if (!finalTranscript.trim() && !selectedImage) {
      setAppState("idle");
      return;
    }

    let currentImage = selectedImage;
    
    setSelectedImage(null);

    const newUserMessage: ChatMessage = { id: Date.now().toString(), sender: "user", text: finalTranscript + (currentImage ? " [Visuals Shared]" : "") };
    setMessages((prev) => [...prev, newUserMessage]);
    
    if (user) {
      saveMessage(user.uid, "user", newUserMessage.text, sessionId);
    }
    
    // If live session is active and NO image, send text through it
    if (isSessionActive && liveSessionRef.current && !currentImage) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    setAppState("processing");

    // 1. Check for browser commands (only if no image)
    const commandResult = !currentImage ? processCommand(finalTranscript) : { isBrowserAction: false, action: "", url: "" };

    let responseText = "";

    if (commandResult.isBrowserAction) {
      responseText = commandResult.action;
      const newIyraMessage: ChatMessage = { id: Date.now().toString() + "-z", sender: "iyra", text: responseText };
      setMessages((prev) => [...prev, newIyraMessage]);
      
      if (user) {
        saveMessage(user.uid, "iyra", responseText, sessionId);
      }
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getIyraAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }

      setAppState("idle");

      setTimeout(() => {
        if (commandResult.url) {
          window.open(commandResult.url, "_blank");
        }
      }, 1500);
    } else {
      // 2. General Chat via Gemini (with optional screenshot)
      responseText = await getIyraResponse(finalTranscript || "How are you doing today?", messagesRef.current, currentImage || undefined, user);
      const newIyraMessage: ChatMessage = { id: Date.now().toString() + "-z", sender: "iyra", text: responseText };
      setMessages((prev) => [...prev, newIyraMessage]);
      
      if (user) {
        saveMessage(user.uid, "iyra", responseText, sessionId);
      }
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getIyraAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }
      setAppState("idle");
    }
  }, [isMuted, isSessionActive, selectedImage, user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setShowTextInput(true); // Open text input to allow caption/command with image
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = async () => {
    if (!user) {
      alert("Please sign in to talk with Iyra!");
      return;
    }
    if (isSessionActive) {
      setIsSessionActive(false);
      setSessionError(null);
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setAppState("idle");
      resetIyraSession();
    } else {
      try {
        setSessionError(null);
        resetIyraSession();
        
        const session = new LiveSessionManager();
        session.isMuted = isMuted;
        session.user = user;
        // Pass a summary of the last 10 messages for context in the live session
        session.historyContext = messages.slice(-10).map(m => `${m.sender.toUpperCase()}: ${m.text}`).join("\n");
        liveSessionRef.current = session;
        
        session.onStateChange = (state) => {
          setAppState(state);
        };
        
        session.onMessage = (sender, text) => {
          const mid = Date.now().toString() + "-" + sender;
          setMessages((prev) => [...prev, { id: mid, sender, text }]);
          if (user) {
            saveMessage(user.uid, sender, text, sessionId);
          }
        };
        
        session.onCommand = (url) => {
          setTimeout(() => {
            window.open(url, "_blank");
          }, 1000);
        };

        setIsSessionActive(true);
        await session.start();
      } catch (e: any) {
        console.error("Failed to start session", e);
        setSessionError(e.message || "Failed to start session. Check your internet and microphone.");
        setIsSessionActive(false);
        setAppState("idle");
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    if (!user) {
      alert("Please sign in to talk with Iyra!");
      return;
    }
    
    handleTextCommand(textInput);
    setTextInput("");
    setShowTextInput(false);
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#050505] text-white flex flex-col items-center justify-between font-sans relative overflow-hidden m-0 p-0">
      <Diagnostics 
        isOpen={isDiagnosticsOpen} 
        onClose={() => setIsDiagnosticsOpen(false)} 
      />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
      <AnimatePresence>
        {isMarketDashboardOpen && (
          <MarketDashboard 
            isOpen={isMarketDashboardOpen} 
            onClose={() => setIsMarketDashboardOpen(false)} 
          />
        )}
      </AnimatePresence>
      {showPermissionModal && (
        <PermissionModal 
          onClose={() => setShowPermissionModal(false)} 
        />
      )}

      {/* Cinematic Background Gradients */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-900/20 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full flex justify-between items-center z-20 shrink-0 px-6 py-4 md:px-12 md:py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-sm">
            I
          </div>
          <h1 className="text-xl font-serif font-medium tracking-wide opacity-90">Iyra</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-green-500 animate-pulse' : serverStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`} />
            <span className="text-[10px] text-white/40 uppercase tracking-widest">{serverStatus}</span>
          </div>
          {user && (
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[10px] text-white/50">Logged in as</span>
              <span className="text-xs font-medium text-pink-400">{user.displayName?.split(' ')[0]}</span>
            </div>
          )}
          <button
            onClick={() => {
              setMessages([]);
              setSessionId(Date.now().toString());
              resetIyraSession();
            }}
            className="p-2 rounded-full bg-white/5 hover:bg-violet-500/20 hover:text-violet-400 transition-colors border border-white/10"
            title="New Chat"
          >
            <Plus size={18} className="opacity-70" />
          </button>
          {messages.length > 0 && (
            <button
              onClick={async () => {
                if (confirm("Are you sure you want to clear the chat history?")) {
                  setMessages([]);
                  resetIyraSession();
                  if (user) await clearUserHistory(user.uid);
                }
              }}
              className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors border border-white/10"
              title="Clear Chat History"
            >
              <Trash2 size={18} className="opacity-70" />
            </button>
          )}
          <button
            onClick={() => setIsMarketDashboardOpen(true)}
            className="p-2 rounded-full bg-white/5 hover:bg-violet-500/20 hover:text-violet-400 transition-colors border border-white/10"
            title="Market Stats"
          >
            <TrendingUp size={18} className="opacity-70" />
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX size={18} className="opacity-70" />
            ) : (
              <Volume2 size={18} className="opacity-70" />
            )}
          </button>
          {user ? (
            <button
              onClick={() => signOutUser()}
              className="px-3 py-1.5 text-xs rounded-full bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 text-xs rounded-full bg-pink-500 hover:bg-pink-600 transition-colors font-medium shadow-lg shadow-pink-500/20"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content - Visualizer & Chat */}
      <main className="absolute inset-0 flex flex-row items-center justify-between w-full h-full z-10 overflow-hidden pt-20 pb-24 px-4 md:px-12 pointer-events-none">
        
        {/* Left Column: Iyra Status */}
        <div className="flex w-[30%] lg:w-[25%] h-full flex-col justify-center gap-4 z-10">
          <div className="h-6">
            <AnimatePresence mode="wait">
              {sessionError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-xs"
                >
                  {sessionError}
                  <button 
                    onClick={() => setSessionError(null)}
                    className="block mt-1 underline"
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}
              {appState === "processing" && !sessionError && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-2 text-cyan-300/80 text-sm md:text-base italic font-serif"
                >
                  <Loader2 size={16} className="animate-spin" />
                  Replying...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center Visualizer (Fixed Full Screen Background) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <Visualizer state={appState} />
        </div>

        {/* Right Column: User Status */}
        <div className="flex w-[30%] lg:w-[25%] h-full flex-col justify-center gap-4 z-10">
          <div className="h-6 flex justify-end">
            <AnimatePresence>
              {appState === "listening" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 text-violet-300/80 text-sm md:text-base italic"
                >
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  Listening...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </main>

      {/* Controls */}
      <footer className="absolute bottom-0 left-0 w-full flex flex-col items-center justify-center pb-6 md:pb-8 z-20 shrink-0 gap-4">
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-violet-500/50 shadow-lg mb-2"
            >
              <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showTextInput && (
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onSubmit={handleTextSubmit}
              className="w-full max-w-md flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1 pl-4 backdrop-blur-md shadow-2xl"
            >
              <input 
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message to Iyra..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 text-sm"
                autoFocus
              />
              <button 
                type="submit"
                disabled={!textInput.trim()}
                className="p-2 rounded-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:hover:bg-violet-500 transition-colors"
              >
                <Send size={16} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleListening}
            className={`
              group relative flex items-center gap-3 px-8 py-4 rounded-full font-medium tracking-wide transition-all duration-300 shadow-2xl
              ${
                isSessionActive
                  ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                  : "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105"
              }
            `}
          >
            {isSessionActive ? (
              <>
                <MicOff size={20} />
                <span>End Session</span>
              </>
            ) : (
              <>
                <Mic size={20} className="group-hover:animate-bounce" />
                <span>Start Session</span>
              </>
            )}
          </button>
          
          {isSessionActive && (
            <div className="flex gap-2">
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shadow-2xl ${selectedImage ? 'text-violet-400 border-violet-500/30 bg-violet-500/10' : ''}`}
                title="Upload Chart Image"
              >
                <ImagePlus size={20} className={selectedImage ? "opacity-100" : "opacity-70"} />
              </button>
              <button
                onClick={() => setShowTextInput(!showTextInput)}
                className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shadow-2xl"
                title="Type instead"
              >
                <Keyboard size={20} className="opacity-70" />
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
