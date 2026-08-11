import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ThinkSpace — Collaborative Whiteboard",
    template: "%s | ThinkSpace",
  },
  description:
    "A modern collaborative whiteboard for teams. Draw, brainstorm, and create together in real time.",
  keywords: [
    "whiteboard",
    "collaboration",
    "drawing",
    "brainstorm",
    "realtime",
    "teamwork",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
