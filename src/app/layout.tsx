import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./components/ClientLayout";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "SHIDS STYLE | Elevate Your Style",
  description:
    "SHIDS STYLE is a modern e-commerce experience with elevated essentials, responsive shopping, and an admin cockpit for orders and inventory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientLayout>{children}</ClientLayout>
        <Analytics />
      </body>
    </html>
  );
}
