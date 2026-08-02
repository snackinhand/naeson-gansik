import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DisclosureNotice } from "@/components/DisclosureNotice";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "내손의간식 - 간식 핫딜 모음",
  description: "진짜 저렴할 때만 소개하는 간식 특가 모음",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
        {children}
        <footer className="border-t border-zinc-200 py-6 dark:border-zinc-800">
          <DisclosureNotice />
        </footer>
      </body>
    </html>
  );
}
