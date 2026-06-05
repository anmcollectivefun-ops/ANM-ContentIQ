import type { Metadata } from "next";
import {
  Playfair_Display,
  Montserrat,
  Cormorant_Garamond,
} from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin-ext"],
  variable: "--font-heading",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  variable: "--font-body",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin-ext"],
  variable: "--font-label",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ANM ContentIQ",
  description: "Centrum contentu i analityki AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body
        className={`${playfair.variable} ${montserrat.variable} ${cormorant.variable}`}
      >
        {children}
      </body>
    </html>
  );
}