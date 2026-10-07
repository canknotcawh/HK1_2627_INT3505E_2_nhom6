import keycloak from "./keycloak";

let initialization: Promise<boolean> | undefined;

export function initKeycloak(): Promise<boolean> {
  initialization ??= keycloak.init({
      onLoad: "check-sso",
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      pkceMethod: "S256",
    });

  return initialization;
}

export function scheduleTokenRefresh(): ReturnType<typeof setInterval> {
  return setInterval(() => {
    keycloak.updateToken(30).catch(() => {
      keycloak.login();
    });
  }, 15000);
}
