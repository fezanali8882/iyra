import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { Activity, Database, Key, Shield, Wifi } from 'lucide-react';

export default function Diagnostics({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [report, setReport] = useState<{
    auth: any;
    firestore: string;
    server: string;
    apiKeySet: boolean;
    audio: any;
  } | null>(null);

  const runDiagnostics = async () => {
    const diag: any = {
      auth: {
        uid: auth.currentUser?.uid || 'Not Logged In',
        email: auth.currentUser?.email || 'N/A',
        verified: auth.currentUser?.emailVerified ? 'Yes' : 'No'
      },
      firestore: 'Checking...',
      server: 'Checking...',
      apiKeySet: false,
      audio: {
        state: 'N/A'
      }
    };

    // 1. Server & API Key Check
    try {
      const res = await fetch('/api/live-config');
      if (res.ok) {
        const data = await res.json();
        diag.apiKeySet = !!data.apiKey && data.apiKey !== 'your_gemini_api_key_here';
        diag.server = 'Online';
      } else {
        diag.server = `Error: ${res.status}`;
      }
    } catch (e) {
      diag.server = 'Unreachable';
    }

    // 2. Firestore Check
    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        const profileRef = doc(db, 'users', uid);
        await getDocFromServer(profileRef);
        diag.firestore = 'Connected';
      } else {
        diag.firestore = 'Login Required';
      }
    } catch (e: any) {
      diag.firestore = `Error: ${e.message}`;
    }

    // 3. Audio Check
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const ctx = new AudioContextClass();
      diag.audio.state = ctx.state;
      ctx.close();
    } catch (e) {
      diag.audio.state = 'Unavailable';
    }

    setReport(diag);
  };

  useEffect(() => {
    if (isOpen) runDiagnostics();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-pink-500" />
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-pink-500" /> System Diagnostics
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/50 hover:text-white">
            <Wifi size={20} />
          </button>
        </div>

        {!report ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <DiagnosticCard 
                icon={<Shield size={16} />} 
                title="Auth" 
                status={report.auth.uid !== 'Not Logged In' ? 'Active' : 'Missing'} 
                detail={report.auth.uid.slice(0, 8) + '...'}
                isOk={report.auth.uid !== 'Not Logged In'}
              />
              <DiagnosticCard 
                icon={<Database size={16} />} 
                title="Database" 
                status={report.firestore === 'Connected' ? 'Healthy' : 'Error'} 
                detail={report.firestore}
                isOk={report.firestore === 'Connected'}
              />
              <DiagnosticCard 
                icon={<Wifi size={16} />} 
                title="Backend" 
                status={report.server === 'Online' ? 'Online' : 'Down'} 
                detail={report.server}
                isOk={report.server === 'Online'}
              />
              <DiagnosticCard 
                icon={<Key size={16} />} 
                title="Gemini API" 
                status={report.apiKeySet ? 'Configured' : 'Missing'} 
                detail={report.apiKeySet ? 'Key is set' : 'Add to Secrets'}
                isOk={report.apiKeySet}
              />
            </div>

            <div className="bg-white/5 rounded-xl p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-white/40">Email:</span>
                <span>{report.auth.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Verified:</span>
                <span className={report.auth.verified === 'Yes' ? 'text-green-400' : 'text-red-400'}>{report.auth.verified}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Audio Context:</span>
                <span>{report.audio.state}</span>
              </div>
            </div>

            <button 
              onClick={runDiagnostics}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-medium transition-colors"
            >
              Rerun Diagnostics
            </button>
            <button 
              onClick={onClose}
              className="w-full py-1 text-sm text-white/30 hover:text-white/60 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DiagnosticCard({ icon, title, status, detail, isOk }: any) {
  return (
    <div className={`p-3 rounded-xl border border-white/5 flex flex-col gap-1 ${isOk ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-white/50">
        {icon} {title}
      </div>
      <div className={`text-sm font-bold ${isOk ? 'text-green-400' : 'text-red-400'}`}>
        {status}
      </div>
      <div className="text-[10px] text-white/40 truncate">
        {detail}
      </div>
    </div>
  );
}
