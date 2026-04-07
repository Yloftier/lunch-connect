import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "랭디 커넥트",
  description: "함께의 즐거움, 랭디 커넥트",
  icons: {
    icon: "/langdyconnect.png",
    apple: "/langdyconnect.png",
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}