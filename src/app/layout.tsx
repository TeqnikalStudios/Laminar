import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/shell/Shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LAMINAR", template: "%s · LAMINAR" },
  description: "LAMINAR: real-time cryptocurrency markets, charts and portfolio tracking.",
};

export const viewport: Viewport = {
  themeColor: "#04060c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
