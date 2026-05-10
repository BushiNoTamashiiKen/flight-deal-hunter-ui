import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const origin = base.replace(/\/$/, "");
  return {
    name: "Skyflint",
    short_name: "Skyflint",
    description:
      "Deep multi-source flight deal search powered by an autonomous agent.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0ea5e9",
    icons: [
      {
        src: `${origin}/icon`,
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
