import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Logdrio",
  description: "Professional log analysis and monitoring platform",
  themeColor: "#16161d",
  viewport: {
    width: "device-width",
    initialScale: 1.0,
    minimumScale: 1.0,
    maximumScale: 1.0,
    userScalable: false,
    viewportFit: "cover",
  },
  formatDetection: {
    telephone: true,
  },
  appleWebApp: {
    capable: true,
    title: "Logdrio",
    statusBarStyle: "black",
  },
  other: {
    "msapplication-tap-highlight": "no",
    "http-equiv": "x-ua-compatible",
    "content": "IE=Edge",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
