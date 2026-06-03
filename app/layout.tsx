import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ANM ContentIQ",
  description: "AI Content Intelligence Platform",
  icons: {
    icon: "/app-icon.svg",
    shortcut: "/app-icon.svg",
    apple: "/app-icon.svg",
  },
  verification: {
    other: {
      "tiktok-domain-verification": "abc123xyz", // tu wklej swój kod z TikToka
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
