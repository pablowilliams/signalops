import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://signalops-intelligence.gjpw.chatgpt.site"),
  title: "SignalOps | Data incident intelligence",
  description:
    "Detect, diagnose, and explain data incidents with measurable evidence.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "SignalOps",
    description: "Data incident intelligence with reproducible evaluation.",
    type: "website",
    images: [
      {
        url: "/og-cyber-lab.png",
        width: 1200,
        height: 630,
        alt: "SignalOps incident intelligence command center",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SignalOps",
    description: "Data incident intelligence with reproducible evaluation.",
    images: ["/og-cyber-lab.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
