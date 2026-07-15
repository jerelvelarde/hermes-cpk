import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hermes ⇄ CopilotKit · Command Center",
  description: "Liveness + replayable conversation trace for the Hermes AG-UI demo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
