import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Logdrio",
    short_name: "Logdrio",
    description:
      "Local-first personal finance tracker with double-entry bookkeeping.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#111111",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/256.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/196.png",
        sizes: "196x196",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/180.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/152.png",
        sizes: "152x152",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/144.png",
        sizes: "144x144",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/128.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/120.png",
        sizes: "120x120",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/114.png",
        sizes: "114x114",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/92.png",
        sizes: "92x92",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/87.png",
        sizes: "87x87",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/80.png",
        sizes: "80x80",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/76.png",
        sizes: "76x76",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/72.png",
        sizes: "72x72",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/64.png",
        sizes: "64x64",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/60.png",
        sizes: "60x60",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/58.png",
        sizes: "58x58",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/57.png",
        sizes: "57x57",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/48.png",
        sizes: "48x48",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/40.png",
        sizes: "40x40",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/32.png",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/AppIcons/Assets.xcassets/AppIcon.appiconset/29.png",
        sizes: "29x29",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
