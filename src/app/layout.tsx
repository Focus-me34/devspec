import type { Metadata } from "next";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://devspec.app";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "devSpec — write the spec before you build it",
    template: "%s | devSpec",
  },
  description:
    "devSpec is a feature specification tool for small development teams. Every feature has to answer six questions and list its acceptance checks before it can move out of discussion.",
  keywords: [
    "feature specification tool", "software requirements", "acceptance criteria",
    "small dev teams", "spec before code", "product requirements",
    "definition of done", "lightweight issue tracker",
  ],
  authors: [{ name: "devSpec" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: site,
    siteName: "devSpec",
    title: "devSpec — write the spec before you build it",
    description:
      "Six questions and at least one acceptance check, enforced by the database. Small teams stop shipping features nobody defined.",
  },
  twitter: {
    card: "summary_large_image",
    title: "devSpec — write the spec before you build it",
    description:
      "Six questions and at least one acceptance check, enforced before a feature can move forward.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
