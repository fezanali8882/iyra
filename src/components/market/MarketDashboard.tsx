import React, { useEffect, useRef } from 'react';
import TradingViewChart from './TradingViewChart';
import LivePriceFeed from './LivePriceFeed';
import { X, TrendingUp, Clock, Globe, Zap } from 'lucide-react';
import { getCurrentMarketInfo } from '../../utils/marketUtils';
import { motion } from 'motion/react';

const TickerTape: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current) {
      container.current.innerHTML = '';
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        "symbols": [
          { "proName": "FX_IDC:XAUUSD", "title": "Gold" },
          { "proName": "OANDA:XAGUSD", "title": "Silver" },
          { "proName": "BITSTAMP:BTCUSD", "title": "BTC" },
          { "proName": "BITSTAMP:ETHUSD", "title": "ETH" },
          { "proName": "FX:EURUSD", "title": "EUR/USD" },
          { "proName": "FX:GBPUSD", "title": "GBP/USD" },
          { "proName": "NYMEX:CL1!", "title": "Oil" }
        ],
        "showSymbolLogo": true,
        "colorTheme": "dark",
        "isTransparent": false,
        "displayMode": "adaptive",
        "locale": "en"
      });
      container.current.appendChild(script);
    }
  }, []);

  return (
    <div className="w-full bg-black border-b border-white/5 h-[46px] flex items-center overflow-hidden shrink-0 relative z-20">
      <div className="tradingview-widget-container w-full" ref={container}>
        <div className="tradingview-widget-container__widget"></div>
      </div>
    </div>
  );
};

const MarketNews: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current) {
      container.current.innerHTML = '';
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        "feedMode": "all_symbols",
        "colorTheme": "dark",
        "isTransparent": false,
        "displayMode": "regular",
        "width": "100%",
        "height": "100%",
        "locale": "en"
      });
      container.current.appendChild(script);
    }
  }, []);

  return (
    <div className="w-full h-[300px] bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
      <div className="tradingview-widget-container" ref={container}>
        <div className="tradingview-widget-container__widget"></div>
      </div>
    </div>
  );
};

const EconomicCalendar: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current) {
      container.current.innerHTML = '';
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        "colorTheme": "dark",
        "isTransparent": false,
        "width": "100%",
        "height": "100%",
        "locale": "en",
        "importanceFilter": "-1,0,1",
        "currencyFilter": "USD,EUR,GBP,JPY,AUD,CAD,CHF,NZD"
      });
      container.current.appendChild(script);
    }
  }, []);

  return (
    <div className="w-full h-[400px] bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
      <div className="tradingview-widget-container" ref={container}>
        <div className="tradingview-widget-container__widget"></div>
      </div>
    </div>
  );
};

interface MarketDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const MarketDashboard: React.FC<MarketDashboardProps> = ({ isOpen, onClose }) => {
  const marketInfo = getCurrentMarketInfo();

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.98 }}
      className="fixed inset-0 md:inset-y-4 md:right-4 w-full md:w-[500px] lg:w-[650px] bg-black/95 md:bg-black/90 backdrop-blur-3xl md:border border-white/10 z-[100] flex flex-col md:rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
    >
      <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-violet-500/10 to-transparent shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center border border-white/10 group overflow-hidden relative transition-all duration-300">
             <div className="absolute inset-0 bg-violet-500/20 group-hover:bg-violet-500/40 transition-colors" />
             <TrendingUp className="text-violet-400 relative z-10 w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-serif font-medium text-white italic leading-tight">Market Intelligence</h2>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono font-bold">Live Data Feed</p>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center text-white/40 hover:text-white border border-white/5 group"
        >
          <X className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      <TickerTape />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-0 pb-10">
        <div className="p-4 md:p-6 space-y-6 md:space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 font-sans">
          <div className="col-span-1 p-3 md:p-4 bg-white/5 rounded-xl md:rounded-2xl border border-white/10 hover:border-violet-500/30 transition-colors group">
            <span className="text-[9px] md:text-[10px] text-white/30 uppercase tracking-widest font-bold block mb-1 md:mb-2 group-hover:text-violet-400">Status</span>
            <div className="flex items-baseline gap-1">
              <span className="text-base md:text-lg font-mono text-white leading-none">PKT</span>
              <span className="text-[10px] md:text-xs text-white/50">{marketInfo.pkTime.split(',')[2]?.trim() || 'N/A'}</span>
            </div>
          </div>
          <div className="col-span-1 lg:col-span-2 p-3 md:p-4 bg-white/5 rounded-xl md:rounded-2xl border border-white/10 hover:border-pink-500/30 transition-colors group">
            <span className="text-[9px] md:text-[10px] text-white/30 uppercase tracking-widest font-bold block mb-1 md:mb-2 group-hover:text-pink-400">Sessions</span>
            <p className="text-xs md:text-sm font-medium text-white/90 truncate">{marketInfo.activeSessions}</p>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 md:p-1.5 bg-violet-500/20 rounded-lg text-violet-400">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-[10px] md:text-xs font-bold text-white/70 uppercase tracking-widest">Global Quotes</h3>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20 min-h-[400px] relative z-0">
            <LivePriceFeed />
          </div>
        </section>

        <section className="space-y-3 h-[300px] md:h-[450px] flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 md:p-1.5 bg-pink-500/20 rounded-lg text-pink-400">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-[10px] md:text-xs font-bold text-white/70 uppercase tracking-widest">Advanced Chart</h3>
            </div>
          </div>
          <div className="flex-1 min-h-0 min-w-0 rounded-2xl overflow-hidden border border-white/10 shadow-inner">
            <TradingViewChart />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 md:p-1.5 bg-amber-500/20 rounded-lg text-amber-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-[10px] md:text-xs font-bold text-white/70 uppercase tracking-widest">Economic Calendar (Forex Factory)</h3>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20 min-h-[400px]">
            <EconomicCalendar />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 md:p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-[10px] md:text-xs font-bold text-white/70 uppercase tracking-widest">Market News</h3>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/5 shadow-inner grow h-[300px]">
            <MarketNews />
          </div>
        </section>
        </div>
      </div>


      <div className="p-4 bg-black/40 border-t border-white/5 backdrop-blur-xl flex items-center justify-center gap-4">
        <p className="text-[9px] text-white/20 italic text-center leading-relaxed max-w-[80%]">
          Real-time market data is provided for informational purposes only. Trading involves significant risk.
          Access provided by iyra Intelligence Systems.
        </p>
      </div>
    </motion.div>
  );
};

export default MarketDashboard;
