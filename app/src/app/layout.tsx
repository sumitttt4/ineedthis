import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/site";
import { ThemeProvider } from "@/components/theme-provider";
import { SIDEBAR_WIDTH_SCRIPT } from "@/lib/sidebar";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "pdf to word",
    "compress video",
    "heic to jpg",
    "remove exif",
    "private file converter",
    "offline file tools",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TAGLINE,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TAGLINE,
    description: SITE_DESCRIPTION,
    creator: "@sumitthq",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} font-sans`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `history.scrollRestoration="manual";${SIDEBAR_WIDTH_SCRIPT};if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID}').catch(()=>{});});}`,
          }}
        />
      </head>
      <body className={`${geist.className} font-sans antialiased selection:bg-primary/20 selection:text-primary`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
