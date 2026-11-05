import type { Metadata, Viewport } from "next";
import "./globals.css";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

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
    <html lang="en-AU" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
