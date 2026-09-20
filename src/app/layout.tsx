// Defines the shared HTML shell, metadata, and fonts for QuizMart.

import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { quizText } from "@/config";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["500", "600", "700"],
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: quizText.title,
  description: quizText.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html className={`${fredoka.variable} ${nunito.variable} h-full`} lang="en">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
