import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { StormContextProvider } from "@/components/providers/StormContextProvider";
import { ServiceWorkerProvider } from "@/components/providers/ServiceWorkerProvider";
import { SyncProvider } from "@/components/providers/SyncProvider";
import { OfflineBanner } from "@/components/common/feedback/OfflineBanner";
import { Toaster } from "@/components/ui/sonner";
import { AgentationLoader } from "@/components/providers/AgentationLoader";

const manrope = localFont({
  src: [
    { path: "../../public/fonts/manrope-400.ttf", weight: "400" },
    { path: "../../public/fonts/manrope-500.ttf", weight: "500" },
    { path: "../../public/fonts/manrope-600.ttf", weight: "600" },
    { path: "../../public/fonts/manrope-700.ttf", weight: "700" },
    { path: "../../public/fonts/manrope-800.ttf", weight: "800" },
  ],
  variable: "--font-manrope",
  display: "swap",
  preload: false,
});

const barlow = localFont({
  src: [
    { path: "../../public/fonts/barlow-condensed-600.ttf", weight: "600" },
    { path: "../../public/fonts/barlow-condensed-700.ttf", weight: "700" },
  ],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Central Command",
  description: "Damage Assessment Platform for Utility Contractors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${barlow.variable}`}>
      <body className="bg-grid-shell antialiased">
        <AuthProvider>
          <StormContextProvider>
          <ServiceWorkerProvider>
            <SyncProvider>
              <OfflineBanner />
              {children}
              {process.env.NODE_ENV === "development" && <AgentationLoader />}
              <Toaster />
            </SyncProvider>
          </ServiceWorkerProvider>
          </StormContextProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
