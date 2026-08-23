import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  agentRules: false,
  images: {
    remotePatterns: [
      // Foto de perfil de quien entra con Google. Supabase la deja en
      // user_metadata.avatar_url y siempre vive en este CDN.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
