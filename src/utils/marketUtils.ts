
export function getCurrentMarketInfo() {
  const now = new Date();
  
  // Format for Pakistan Standard Time
  const pkTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'full',
    timeStyle: 'medium',
    hour12: true
  });

  const pkTimeStr = pkTimeFormatter.format(now);
  
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay();

  const sessions = [];
  
  if (utcHour >= 22 || utcHour < 7) sessions.push("Sydney");
  if (utcHour >= 0 && utcHour < 9) sessions.push("Tokyo");
  if (utcHour >= 8 && utcHour < 17) sessions.push("London");
  if (utcHour >= 13 && utcHour < 22) sessions.push("New York");

  const isMarketOpen = utcDay !== 0 && utcDay !== 6;
  
  return {
    pkTime: pkTimeStr,
    utcTime: now.toUTCString(),
    activeSessions: sessions.length > 0 ? sessions.join(", ") : "Closed/Slow",
    isMarketOpen,
    isNewYorkSession: utcHour >= 13 && utcHour < 22
  };
}
