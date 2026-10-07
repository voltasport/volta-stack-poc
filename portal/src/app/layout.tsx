import type {Metadata} from "next";
import type {ReactNode} from "react";
import {Geist} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Volta portal",
  description: "Programs, proofs, rosters, and team stores for athletics directors.",
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
