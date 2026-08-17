import type { Metadata } from "next";

/** The page itself is a client component and cannot export metadata, so it
 *  lives here. noindex because an invite URL carries a working token in its
 *  query string and has no business in a search index. robots.ts disallows
 *  /invite as well; this is the belt to that pair of braces. */
export const metadata: Metadata = {
  title: "Join a team on DevSpec",
  description:
    "You have been invited to a DevSpec team. Create an account and you land straight in it, with the features and specifications the team is working on.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    title: "Join a team on DevSpec",
    description: "Someone invited you to their team. Write the spec before you build it.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Join a team on DevSpec",
    description: "Someone invited you to their team. Write the spec before you build it.",
  },
};

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
