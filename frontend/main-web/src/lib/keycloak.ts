import Keycloak from "keycloak-js";

const configuredKeycloakUrl = new URL(import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8081");
if (["localhost", "127.0.0.1"].includes(configuredKeycloakUrl.hostname)
    && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    configuredKeycloakUrl.hostname = window.location.hostname;
}

const keycloak = new Keycloak({
    url: configuredKeycloakUrl.toString().replace(/\/$/, ""),
    realm: import.meta.env.VITE_KEYCLOAK_REALM,
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
});

export default keycloak;
