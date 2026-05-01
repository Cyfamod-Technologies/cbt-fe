import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/app/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cyfamod CBT Portal",
  description:
    "Standalone CBT platform for schools using the school UI design reference.",
  icons: {
    icon: "/assets/img/favicon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
} as const;

const schoolStylesheets = [
  "/assets/css/normalize.css",
  "/assets/css/bootstrap.min.css",
  "/assets/css/all.min.css",
  "/assets/fonts/flaticon.css",
  "/assets/css/animate.min.css",
  "/assets/css/main.css",
  "/assets/style.css",
] as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {schoolStylesheets.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body
        className="min-h-full bg-[#f5efe8] text-slate-900"
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
