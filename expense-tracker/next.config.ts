import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ag-ui/hermes ships from pkg.pr.new; transpile it (and the ag-ui client)
  // so Next bundles them cleanly in both the RSC and route-handler graphs.
  transpilePackages: ["@ag-ui/hermes", "@ag-ui/client", "@ag-ui/core"],
};

export default nextConfig;
