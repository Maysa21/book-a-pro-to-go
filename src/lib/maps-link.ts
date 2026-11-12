const ALLOWED_HOST_SUFFIXES = ["google.com", "google.com.br"];
const SHORT_LINK_HOSTS = new Set(["maps.app.goo.gl"]);

function isGoogleHost(hostname: string) {
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  );
}

/**
 * Accepts a pasted Google Maps link and returns it as an https URL.
 * Returns null when nothing was typed; throws when the text is not a Google Maps link.
 */
export function parseMapsLink(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Cole um link do Google Maps válido.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Cole um link do Google Maps válido.");
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const sharedShortLink =
    SHORT_LINK_HOSTS.has(host) || (host === "goo.gl" && url.pathname.startsWith("/maps/"));
  const mapsPage =
    isGoogleHost(host) &&
    (host.startsWith("maps.") || url.pathname === "/maps" || url.pathname.startsWith("/maps/"));
  if (!sharedShortLink && !mapsPage) {
    throw new Error("Cole um link do Google Maps válido.");
  }
  return url.toString();
}

/** Same check, but never throws: use it when rendering a stored link. */
export function safeMapsHref(raw: string | null | undefined): string | null {
  try {
    return parseMapsLink(raw);
  } catch {
    return null;
  }
}

/** True while the typed text is a Google Maps link (used to route the "Endereço / bairro" field). */
export function looksLikeMapsLink(raw: string | null | undefined): boolean {
  return safeMapsHref(raw) !== null;
}

/** What the single "Endereço / bairro" box shows: the saved link when there is one, otherwise the address text. */
export function addressFieldValue(location: string | null | undefined, mapsUrl: string | null | undefined): string {
  return (mapsUrl ?? "").trim() || (location ?? "").trim();
}
