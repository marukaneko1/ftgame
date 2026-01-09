/**
 * WebSocket URL configuration
 * Set NEXT_PUBLIC_WS_URL in Vercel environment variables to your backend WebSocket URL
 * For WebSockets on Vercel, use wss:// (secure WebSocket) instead of https://
 * Example: wss://ftgame-api-xxx.vercel.app
 * For local development, defaults to http://localhost:3001
 */
export const getWebSocketUrl = (): string => {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  
  // Auto-detect: if API URL is set, derive WebSocket URL from it
  if (process.env.NEXT_PUBLIC_API_URL) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    // Convert https:// to wss:// for secure WebSocket
    if (apiUrl.startsWith("https://")) {
      return apiUrl.replace("https://", "wss://");
    }
    // Convert http:// to ws:// for non-secure WebSocket
    if (apiUrl.startsWith("http://")) {
      return apiUrl.replace("http://", "ws://");
    }
  }
  
  return "http://localhost:3001"; // Fallback for local development
};

