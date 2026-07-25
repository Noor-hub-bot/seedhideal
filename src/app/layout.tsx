import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CompareTray } from "@/components/compare-tray";

// Brand fonts per the SeedhiDeal Design System v1.0:
// Newsreader (headlines, prices, wordmark) + Inter (UI and body)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "SeedhiDeal — verified cars from real owners",
    template: "%s | SeedhiDeal",
  },
  description:
    "Trust-first marketplace for verified private-owner cars in Pakistan. Real owners. Real buyers. Seedhi deal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CompareTray />
      </body>
    </html>
  );
}
