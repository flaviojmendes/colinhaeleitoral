import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "divulgacandcontas.tse.jus.br",
        pathname: "/divulga/rest/arquivo/img/**",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/api/**",
      },
      {
        protocol: "https",
        hostname: "static.wikia.nocookie.net",
        pathname: "/nickelodeon/images/**",
      },
    ],
  },
};

export default nextConfig;
