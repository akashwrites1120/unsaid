import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Write-or-Lose | Stop Procrastinating. Start Writing.",
  description:
    "A writing challenge that forces you to keep writing. Pick a topic, choose a mode, and don't stop typing — or you lose. Your writing is never deleted.",
  openGraph: {
    title: "Write-or-Lose | Stop Procrastinating. Start Writing.",
    description:
      "A writing challenge that forces you to keep writing. Pick a topic, choose a mode, and don't stop typing — or you lose.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        {children}
      </body>
    </html>
  );
}