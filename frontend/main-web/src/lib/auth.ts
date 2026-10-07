import keycloak from "./keycloak";

export function initKeycloak(): Promise<boolean> {
  return keycloak.init({
    onLoad: "check-sso",
    silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    pkceMethod: "S256",
  });
}

export function scheduleTokenRefresh(): ReturnType<typeof setInterval> {
  return setInterval(() => {
    keycloak.updateToken(30).catch(() => {
      keycloak.login();
    });
  }, 15000);
}