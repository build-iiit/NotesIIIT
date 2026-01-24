import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/app/_trpc/client";

import { NavbarWrapper } from "@/components/NavbarWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NotesIIIT - Share Notes, Ace Exams",
  description: "The ultimate platform for IIIT students to share lecture notes and collaborate",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-orange-100 via-pink-50 to-purple-100 dark:from-gray-900 dark:via-purple-950/20 dark:to-orange-950/20 min-h-screen`}
      >
        <TRPCReactProvider>
          <NavbarWrapper />
          <main className="pt-16">{children}</main>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
