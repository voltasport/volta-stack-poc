import type {Metadata} from "next";
import type {ReactNode} from "react";
import {Geist} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Volta director portal",
  description: "Next.js proof of concept for the Volta athletics portal",
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
