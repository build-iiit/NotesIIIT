import type { Metadata, Viewport } from"next";
import"./globals.css";
import { TRPCReactProvider } from"@/app/_trpc/client";
import { ThemeProvider } from"@/components/ui/ThemeProvider";
import { Navbar } from"@/components/layout/Navbar";
import { Toaster } from"sonner";
import { SessionProviderWrapper } from"@/components/layout/SessionProviderWrapper";
import { GoogleScripts } from"@/components/layout/GoogleScripts";

export const metadata: Metadata = {
 title:"NotesIIIT - Share Notes, Ace Exams",
 description:"The ultimate platform for IIIT students to share lecture notes and collaborate",
 manifest:"/manifest.json",
 icons: {
 icon:"/favicon.ico",
 shortcut:"/favicon.ico",
 apple:"/apple-icon.png",
 },
 appleWebApp: {
 capable: true,
 statusBarStyle:"black-translucent",
 title:"NotesIIIT",
 },
};

export const viewport: Viewport = {
 themeColor:"#5c4033",
 width:"device-width",
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
 <body
 className={`antialiased min-h-screen relative overflow-x-hidden`}
 suppressHydrationWarning
 >
 {/* Clean background */}
 <div className="fixed inset-0 -z-10">
 <div className="absolute inset-0 bg-background transition-colors duration-300" />
 </div>

 <ThemeProvider
 attribute="class"
 defaultTheme="dark"
 enableSystem={false}
 disableTransitionOnChange
 >
 <SessionProviderWrapper>
 <TRPCReactProvider>
 <Navbar />
 <main className="pt-16">{children}</main>
 <Toaster richColors position="bottom-right" />
 </TRPCReactProvider>
 </SessionProviderWrapper>
 </ThemeProvider>

 {/* Google API Scripts */}
 <GoogleScripts />
 </body>
 </html>
 );
}
