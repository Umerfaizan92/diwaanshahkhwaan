import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { appUrl } from "@/lib/config/app-url";

// Self-hosted and preloaded; size-adjusted fallbacks avoid layout shift while they load
const cinzel = localFont({ src: "../fonts/cinzel.woff2", variable: "--font-cinzel", weight: "400 900", display: "swap", fallback: ["Georgia", "serif"] });
const figtree = localFont({ src: "../fonts/figtree.woff2", variable: "--font-figtree", weight: "300 900", display: "swap", fallback: ["system-ui", "sans-serif"] });

const APP_URL = appUrl();

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Diwaan Shah Khwaan — Home-cooked Pakistani takeaway, Langford WA",
    template: "%s · Diwaan Shah Khwaan",
  },
  description:
    "Royal flavours served with love. Order home-cooked biryani, karahi and Shahi BBQ platters in advance and pick up in Langford, Perth.",
  applicationName: "Diwaan Shah Khwaan",
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Diwaan Shah Khwaan",
    images: [{ url: "/images/dishes/bbq-platter-closeup.webp", width: 1200, height: 1600, alt: "Shahi BBQ platter" }],
  },
  twitter: { card: "summary_large_image" },
  keywords: ["Pakistani food Perth", "biryani Langford", "karahi Perth", "BBQ platters Perth", "halal takeaway Langford", "home-cooked food Perth", "Diwaan Shah Khwaan", "DSK"],
  category: "food",
  authors: [{ name: "Faizan Sabir" }],
  creator: "Faizan Sabir",
  publisher: "Diwaan Shah Khwaan",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#17110d" },
    { media: "(prefers-color-scheme: light)", color: "#f7f0e3" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Applies the saved theme before paint to avoid a flash. Dark is the default.
const themeScript = `try{var t=localStorage.getItem('dsk-theme');if(t==='light')document.documentElement.dataset.theme='light'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" suppressHydrationWarning className={`${cinzel.variable} ${figtree.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Stock dish photos come from this host: open the connection early */}
        <link rel="preconnect" href="https://images.pexels.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://images.pexels.com" />
      </head>
      <body className="min-h-dvh">
        {children}
      </body>
    </html>
  );
}
