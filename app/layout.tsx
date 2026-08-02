import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DisclosureBanner } from "@/components/DisclosureBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "내손의간식 - 무인매장 매입 단가보다 싼 쿠팡 간식",
  description: "도매 매입가보다 쿠팡이 더 쌀 때만 알려주는 무인매장 사장님을 위한 실시간 매입 특가",
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
        <DisclosureBanner />
        {children}
      </body>
    </html>
  );
}
