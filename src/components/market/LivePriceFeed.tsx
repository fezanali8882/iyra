import React, { useEffect, useRef } from 'react';

const LivePriceFeed: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current) {
      container.current.innerHTML = '';
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        "width": "100%",
        "height": "100%",
        "symbolsGroups": [
          {
            "name": "Commodities",
            "originalName": "Commodities",
            "symbols": [
              { "name": "FX_IDC:XAUUSD", "displayName": "Gold" },
              { "name": "OANDA:XAGUSD", "displayName": "Silver" },
              { "name": "NYMEX:CL1!", "displayName": "Crude Oil" }
            ]
          },
          {
            "name": "Crypto",
            "symbols": [
              { "name": "BITSTAMP:BTCUSD", "displayName": "BTC" },
              { "name": "BITSTAMP:ETHUSD", "displayName": "ETH" }
            ]
          }
        ],
        "showSymbolLogo": true,
        "colorTheme": "dark",
        "isTransparent": false,
        "locale": "en"
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

export default LivePriceFeed;
