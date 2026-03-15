import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow all local network addresses since wildcards sometimes don't cover ports properly
  allowedDevOrigins: ["localhost", "192.168.31.17"],
};

export default nextConfig;
