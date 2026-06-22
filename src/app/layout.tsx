import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LevelUpToast } from "@/components/layout/LevelUpToast";
import { PWARegister } from "@/components/PWARegister";
import { PremiumSplash } from "@/components/layout/PremiumSplash";
import { AuthLayoutGuard } from "@/components/layout/AuthLayoutGuard";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Master Typing Pro",
  description: "Advanced typing application for mastery",
  manifest: "/manifest.json",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="flex h-full overflow-hidden bg-background text-foreground transition-colors duration-500">
        <PremiumSplash />
        <PWARegister />
        <ThemeProvider>
          <AuthLayoutGuard>
            {children}
          </AuthLayoutGuard>
        </ThemeProvider>
        <LevelUpToast />
      </body>
    </html>
  );
}

