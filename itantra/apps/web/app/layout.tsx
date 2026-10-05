import type { Metadata, Viewport } from "next";
import { Inter, Lexend, Patrick_Hand } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });
const patrick = Patrick_Hand({ subsets: ["latin"], weight: "400", variable: "--font-patrick", display: "swap" });

export const metadata: Metadata = {
  title: "iTantra — offline voice link",
  description: "Device-to-device voice messaging for Indian languages with no internet.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1a22" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="day" suppressHydrationWarning className={`${inter.variable} ${lexend.variable} ${patrick.variable}`}>
      <body>{<Providers>{children}</Providers>}</body>
    </html>
  );
}
