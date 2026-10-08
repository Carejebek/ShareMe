import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import PwaRegister from "@/components/PwaRegister";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata: Metadata = {
  title: "JayXZ | Drive Your Freedom.",
  description:
    "JayXZ is a digital mobility platform connecting people with trusted vehicles and vehicle owners.",
  applicationName: "JayXZ",
  appleWebApp: { capable: true, title: "JayXZ", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#0c7f47" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-950 antialiased">
        <Providers>
          <Navbar />
          {children}
          <PwaRegister />
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
