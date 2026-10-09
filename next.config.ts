import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node-only IMAP/MIME libraries: load them from node_modules at runtime instead of bundling.
  serverExternalPackages: ["imapflow", "mailparser"],
  // Dev only: let other devices on the LAN (e.g. a phone) load the dev server's assets and HMR.
  allowedDevOrigins: ["192.168.1.9"],
};

export default nextConfig;
