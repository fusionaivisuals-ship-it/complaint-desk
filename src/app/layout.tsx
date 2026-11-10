import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "complaint-desk — under construction",
  description:
    "A complaint intelligence system built on the public CFPB consumer complaint database, limited to debt collection complaints.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
