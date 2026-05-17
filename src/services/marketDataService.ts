interface MarketStatus {
  price: string;
  change: string;
  sentiment: string;
}

/**
 * Service to provide Iyra with market intelligence context
 */
export const getMarketIntelligence = async (symbol: string): Promise<string> => {
  // In a real production app, we would call a backend helper here 
  // or use the Gemini model's web search capability.
  // For this implementation, we will return a descriptive prompt that 
  // includes the specific TradingView info and instructions for the AI.
  
  return `You have access to real-time market data for ${symbol}. 
  Current view: The user is looking at a technical chart and news feed for this asset.
  To give accurate advice:
  1. Check the latest news in the "Market News" section of the dashboard.
  2. Analyze technical trends (Support/Resistance) visible in the chart.
  3. If you need current specific prices, use your internal search or grounding capabilities to find them.`;
};

export const getLatestNews = async (symbol: string): Promise<any[]> => {
  // This would ideally fetch from a news API.
  // For now, we'll return a placeholder that reinforces the AI's role.
  return [
    { title: "Gold prices steady near record highs", source: "MarketWire" },
    { title: "US Dollar weakens, boosting XAUUSD appeal", source: "FinanceTimes" }
  ];
};
