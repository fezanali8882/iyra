import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    TradingView: any;
  }
}

const TradingViewChart: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current) {
      container.current.innerHTML = '';
    }
    const scriptId = 'tradingview-widget-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      document.head.appendChild(script);
    }

    const initWidget = () => {
      if (container.current && window.TradingView) {
        new window.TradingView.widget({
          width: '100%',
          height: '100%',
          symbol: 'FX_IDC:XAUUSD',
          interval: 'D',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: 'tradingview_chart_container',
          backgroundColor: 'rgba(0, 0, 0, 1)',
          gridColor: 'rgba(240, 243, 250, 0.06)',
          hide_side_toolbar: false,
          details: true,
          hotlist: true,
          calendar: true,
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650',
        });
      }
    };

    if (window.TradingView) {
      initWidget();
    } else {
      script.onload = initWidget;
    }

    return () => {
      // Clean up script if needed
    };
  }, []);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-md">
      <div id="tradingview_chart_container" ref={container} className="w-full h-full" />
    </div>
  );
};

export default TradingViewChart;
