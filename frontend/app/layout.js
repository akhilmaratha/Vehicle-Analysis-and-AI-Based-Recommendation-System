import { Inter, Manrope } from "next/font/google";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "VehicleAI — Find a car that fits your life",
  description:
    "Explore vehicles, compare the details, and get AI-assisted recommendations for your budget and everyday needs.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteChrome>{children}</SiteChrome>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
