import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LLM Latency Explorer (Strict)",
  description: "Accepts only { responses: [...] } with snake_case keys."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
