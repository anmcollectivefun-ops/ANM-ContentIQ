import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ANM ContentIQ",
  description: "AI Content Intelligence Platform",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/ANM_ContentIQ_.JPG", sizes: "1024x1024", type: "image/jpeg" },
    ],
    shortcut: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
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
