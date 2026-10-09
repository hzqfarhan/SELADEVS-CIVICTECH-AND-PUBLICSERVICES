import type { Metadata, Viewport } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
export const metadata: Metadata = {
  title: "GERAK — A better way to move",
  description:
    "Your city, connected. Live Malaysian mobility, considered journeys and a voice for every neighbourhood.",
  applicationName: "GERAK",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GERAK",
  },
  icons: {
    icon: [
      { url: "/icons/gerak-app-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/icons/gerak-ios-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#11151b",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem('gerak-appearance')==='light'?'light':'dark'}catch{}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
