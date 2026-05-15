import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Austin Homicide Analytics",
  description: "Map-first investigative dashboard for Austin homicide incident records.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
