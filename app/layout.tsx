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
  title: {
    default: "Write or Lose — Keep writing, or lose it all",
    template: "%s · Write or Lose",
  },
  description:
    "A writing challenge that forces you to keep writing. Pick a topic, choose your pressure, and don't stop typing — or you lose. Your words are never deleted.",
  openGraph: {
    title: "Write or Lose — Keep writing, or lose it all",
    description:
      "A writing challenge that forces you to keep writing. Don't stop typing — or you lose.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#fafaf8",
  width: "device-width",
  initialScale: 1,
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
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
