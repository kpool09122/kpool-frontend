import { Suspense } from "react";
import { ConsentEntry } from "./ConsentEntry";

// Set MCP_BROWSER_AUTHORIZATION_URL to <frontend origin>/auth/oauth/authorize.
export default function Page() {
  return <Suspense><ConsentEntry /></Suspense>;
}
