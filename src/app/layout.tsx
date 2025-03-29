import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/context/AuthProvider";
import AuthButton from "@/components/AuthButton";
import Link from 'next/link';

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "CV Match & Feedback",
  description: "Match din CV mot stillingsannonser og få personlig tilbakemelding",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-screen bg-background text-foreground flex flex-col">
        <AuthProvider>
          <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
              <Link href="/" className="mr-6 flex items-center space-x-2">
                <span className="font-bold sm:inline-block">
                  CV Match
                </span>
              </Link>
              <nav className="flex items-center gap-4 text-sm lg:gap-6">
              </nav>
              <div className="flex flex-1 items-center justify-end space-x-4">
                <AuthButton />
              </div>
            </div>
          </header>
          
          <main className="flex-1">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
