import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node-only IMAP/MIME libraries: load them from node_modules at runtime instead of bundling.
  serverExternalPackages: ["imapflow", "mailparser"],
};

export default nextConfig;
