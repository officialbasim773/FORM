import { PRODUCT_NAME } from "@/lib/config";
import type { Metadata } from "next";
import "./globals.css";
import "./theme.css";
import "./booking.css";
import "./form-studio.css";
import "./product-refresh.css";
import "./landing-clean.css";
import "./forms-workspace.css";
import "./form-customisation.css";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description:
    "Collect complete requests. Continue the conversation on WhatsApp.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
