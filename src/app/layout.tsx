import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ServiceWorkerProvider } from "@/components/providers/ServiceWorkerProvider";
import { SyncProvider } from "@/components/providers/SyncProvider";
import { OfflineBanner } from "@/components/common/feedback/OfflineBanner";
import { Toaster } from "@/components/ui/sonner";
import { AgentationLoader } from "@/components/providers/AgentationLoader";

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
    <html lang="en">
      <body className="bg-grid-shell antialiased">
        <AuthProvider>
          <ServiceWorkerProvider>
            <SyncProvider>
              <OfflineBanner />
              {children}
              {process.env.NODE_ENV === "development" && <AgentationLoader />}
              <Toaster />
            </SyncProvider>
          </ServiceWorkerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
