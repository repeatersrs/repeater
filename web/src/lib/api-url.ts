/**
 * The base URL for the backend API.
 *
 * In production, VITE_API_URL is baked in at build time (see web/Dockerfile).
 * In dev it's unset, and we derive the URL from the current origin so the
 * site is reachable from any hostname (localhost, LAN IP, Tailscale, etc.)
 * without per-dev configuration.
 *
 * The port 8000 is coupled to the backend port mapping in docker-compose.yml.
 */
export const apiUrl =
    import.meta.env.VITE_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;
