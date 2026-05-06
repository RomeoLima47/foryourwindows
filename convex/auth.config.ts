import type { AuthConfig } from "convex/server";

if (!process.env.CLERK_JWT_ISSUER_DOMAIN) {
  throw new Error(
    "Missing CLERK_JWT_ISSUER_DOMAIN environment variable"
  );
}

const authConfig: AuthConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

export default authConfig;