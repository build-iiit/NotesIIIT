import type { Metadata, Viewport } from "next";
// import { Geist, Geist_Mono } from "next/font/google"; // Commented out to fix build error
import "./globals.css";
import { TRPCReactProvider } from "@/app/_trpc/client";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeStyleProvider } from "@/components/ThemeStyleProvider";
import { NavbarWrapper } from "@/components/NavbarWrapper";
import { Toaster } from "sonner";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";
import { GoogleScripts } from "@/components/GoogleScripts";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "NotesIIIT - Share Notes, Ace Exams",
  description: "The ultimate platform for IIIT students to share lecture notes and collaborate",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NotesIIIT",
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // interactiveWidget: 'resizes-visual',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`antialiased min-h-screen relative overflow-x-hidden`}
        suppressHydrationWarning
      >
        {/* Liquid Glass Background */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-background transition-colors duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--gradient-from)] via-[var(--gradient-via)] to-[var(--gradient-to)] pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-white/40 to-transparent dark:from-black/40 dark:to-transparent pointer-events-none" />
        </div>

        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ThemeStyleProvider>
            <SessionProviderWrapper>
              <TRPCReactProvider>
                <NavbarWrapper />
                <main className="pt-16">{children}</main>
                <Toaster richColors position="bottom-right" />
              </TRPCReactProvider>
            </SessionProviderWrapper>
          </ThemeStyleProvider>
        </ThemeProvider>

        {/* Google API Scripts */}
        <GoogleScripts />
      </body>
    </html>
  );
}
