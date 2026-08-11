import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "divulgacandcontas.tse.jus.br",
        pathname: "/divulga/rest/arquivo/img/**",
      },
    ],
  },
};

export default nextConfig;
