import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "US-Only Social Play | 18+ Verified",
  description: "Verified 18+ video matchmaking with games, tokens, and rooms. US-only."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-black text-white" suppressHydrationWarning>
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </body>
    </html>
  );
}


