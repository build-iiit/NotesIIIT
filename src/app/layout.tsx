import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/app/_trpc/client";
import { ThemeProvider } from "@/components/theme-provider";
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen relative overflow-x-hidden`}
      >
        {/* High contrast gradient background - vivid colors at edges, neutral center */}
        <div className="fixed inset-0 -z-10">
          {/* Base layer - pure colors */}
          <div className="absolute inset-0 bg-white dark:bg-black" />
          {/* Top gradient - vibrant orange/pink */}
          <div className="absolute top-0 left-0 right-0 h-[45vh] bg-gradient-to-b from-orange-300/50 via-rose-200/30 to-transparent dark:from-orange-700/35 dark:via-rose-600/20 dark:to-transparent" />
          {/* Bottom gradient - vibrant purple */}
          <div className="absolute bottom-0 left-0 right-0 h-[45vh] bg-gradient-to-t from-purple-300/50 via-fuchsia-200/30 to-transparent dark:from-purple-800/35 dark:via-fuchsia-600/20 dark:to-transparent" />
        </div>

        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            <NavbarWrapper />
            <main className="pt-16">{children}</main>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
