// Defines the shared HTML shell, metadata, and fonts for QuizMart.

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { quizText } from "@/config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: quizText.title,
  description: quizText.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html className={`${inter.variable} h-full`} lang="en">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
