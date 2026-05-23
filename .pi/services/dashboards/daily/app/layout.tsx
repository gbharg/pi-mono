import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exult Daily Ops",
  description: "Daily operations dashboard for Exult Healthcare (McKinney TX).",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
