import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/** Self hosted at build time. The previous <link> to fonts.googleapis.com
 *  blocked first paint on two cold connections, one for the stylesheet and
 *  one to gstatic for the files. These are served from our own origin, so
 *  neither round trip happens. */
const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://devspec.app";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "DevSpec — write the spec before you build it",
    template: "%s | DevSpec",
  },
  description:
    "DevSpec is a feature specification tool for small development teams. Every feature has to answer six questions and list its acceptance checks before it can move out of discussion.",
  keywords: [
    "feature specification tool", "software requirements", "acceptance criteria",
    "small dev teams", "spec before code", "product requirements",
    "definition of done", "lightweight issue tracker",
  ],
  authors: [{ name: "DevSpec" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: site,
    siteName: "DevSpec",
    title: "DevSpec — write the spec before you build it",
    description:
      "Six questions and at least one acceptance check, enforced by the database. Small teams stop shipping features nobody defined.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevSpec — write the spec before you build it",
    description:
      "Six questions and at least one acceptance check, enforced before a feature can move forward.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
