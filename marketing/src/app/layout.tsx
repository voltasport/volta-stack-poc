import type {Metadata} from "next";
import type {ReactNode} from "react";
import {Archivo, Inter} from "next/font/google";
import {ScrollReveal} from "@/components/scroll-reveal";
import "./globals.css";

const inter = Inter({subsets: ["latin"], variable: "--font-inter"});
const archivo = Archivo({subsets: ["latin"], variable: "--font-archivo"});

export const metadata: Metadata = {
  title: "Volta Sport",
  description: "Custom teamwear, factory-direct. Designed with you, made direct, tracked live.",
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${archivo.variable}`}>
      <body>
        <ScrollReveal />
        {children}
      </body>
    </html>
  );
}
