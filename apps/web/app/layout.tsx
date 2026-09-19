import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "CardScan",
  description: "Scan. Identify. Collect. Your TCG collection, one scan away.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="cardscan-dark">
      <head>
        {/* Applies the persisted theme before first paint to avoid a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-base-100 text-base-content antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
