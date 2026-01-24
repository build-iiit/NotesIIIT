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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
