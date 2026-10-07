import { useEffect, type ReactNode } from "react";
import keycloak from "../lib/keycloak";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!keycloak.authenticated) {
      keycloak.login();
    }
  }, []);

  if (!keycloak.authenticated) {
    return <p>directing to login...</p>;
  }

  return <>{children}</>;
}
