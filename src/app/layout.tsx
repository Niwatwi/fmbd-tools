// src/app/layout.tsx
import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai"],
  weight: ["300", "400", "500", "600"],
});

export const metadata = {
  title: "FMBD FAMILY HUB",
  description: "RVP Market Intelligence System",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${kanit.className} bg-slate-50 text-slate-800 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
