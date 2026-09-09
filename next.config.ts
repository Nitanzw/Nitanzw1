import type { NextConfig } from "next";

const config: NextConfig = {
  // Empaqueta el servidor con solo lo que necesita para correr: la imagen de
  // Docker queda en cientos de megas en vez de arrastrar node_modules entero.
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default config;
