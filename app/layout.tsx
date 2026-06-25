import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Story Battle - AI 즉흥 스토리 대결",
  description: "갈틱폰 방식으로 AI와 함께 즉흥 스토리를 만드는 멀티플레이어 게임",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
