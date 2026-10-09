import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GERAK · Malaysian mobility",
    short_name: "GERAK",
    description:
      "Your city, connected. Malaysian mobility and civic reporting.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#11151b",
    theme_color: "#11151b",
    lang: "en-MY",
    icons: [
      {
        src: "/icons/gerak-app-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/gerak-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/gerak-app-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["navigation", "travel"],
    shortcuts: [{ name: "Operator dashboard", url: "/operator" }],
  };
}
