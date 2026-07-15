import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ag-ui/hermes", "@ag-ui/client", "@ag-ui/core"],
  // The V2 runtime pulls in server frameworks (express/hono) with dynamic
  // requires Next's bundler can't statically resolve. Keep it external so it's
  // required at runtime from node_modules instead of bundled.
  serverExternalPackages: ["@copilotkit/runtime"],
};

export default nextConfig;
