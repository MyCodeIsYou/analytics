import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "analytics",
  description: "Playwright 자동화 백엔드",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
