import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exult Healthcare — Historical Analytics",
  description:
    "Aggregate snapshot of Exult Healthcare patient cohorts, retention, LTV, providers, services and collections.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg font-sans">{children}</body>
    </html>
  );
}
