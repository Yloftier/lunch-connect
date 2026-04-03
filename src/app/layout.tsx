import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "런넥트",
  description: "함께의 즐거움, 런넥트"
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

