import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.coupangcdn.com",
      },
    ],
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
