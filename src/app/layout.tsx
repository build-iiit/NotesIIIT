import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TRPCReactProvider } from "@/app/_trpc/client";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarWrapper } from "@/components/SidebarWrapper";
import { Toaster } from "sonner";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";
import { GoogleScripts } from "@/components/GoogleScripts";

export const metadata: Metadata = {
  title: "iiitNotes",
  description: "Productivity-centric notes platform.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "iiitNotes",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground flex" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          disableTransitionOnChange
        >
          <SessionProviderWrapper>
            <TRPCReactProvider>
              {/* Sidebar replaces Navbar */}
              <SidebarWrapper />

              {/* Main Content Area - margin left added to clear fixed sidebar */}
              <main className="flex-1 ml-64 p-8 min-h-screen">
                <div className="max-w-5xl mx-auto">
                  {children}
                </div>
              </main>

              <Toaster richColors position="bottom-right" />
            </TRPCReactProvider>
          </SessionProviderWrapper>
        </ThemeProvider>
        <GoogleScripts />
      </body>
    </html>
  );
}
