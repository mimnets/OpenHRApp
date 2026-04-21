/**
 * SEO utilities for clean URL navigation, meta tags, and structured data.
 */

const SITE_ORIGIN = 'https://openhrapp.com';
const DEFAULT_SOCIAL_IMAGE = `${SITE_ORIGIN}/img/screenshot-wide.webp`;

/** Navigate to a clean URL path using pushState + popstate dispatch. */
export function navigateTo(path: string): void {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Upsert (create-or-update) a meta tag keyed by either `name` or `property`. */
function upsertMeta(kind: 'name' | 'property', key: string, value: string): void {
  let el = document.querySelector(`meta[${kind}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(kind, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

/**
 * Update document title, meta description, canonical link, and all social
 * (Open Graph + Twitter) tags. Must be called from every public page's
 * `useEffect` on mount so social unfurls of a specific route don't fall
 * back to the homepage tags baked into `index.html`.
 */
export function updatePageMeta(
  title: string,
  description: string,
  canonical?: string,
  image?: string,
): void {
  document.title = title;

  let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  if (metaDesc) {
    metaDesc.content = description;
  }

  const resolvedCanonical = canonical || `${SITE_ORIGIN}${window.location.pathname}`;

  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = resolvedCanonical;

  const resolvedImage = image || DEFAULT_SOCIAL_IMAGE;

  // Open Graph
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', resolvedCanonical);
  upsertMeta('property', 'og:image', resolvedImage);

  // Twitter Card
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', resolvedImage);
}

/** Inject or update a JSON-LD structured data script in the document head. */
export function setJsonLd(data: Record<string, unknown> | null): void {
  let script = document.getElementById('dynamic-jsonld') as HTMLScriptElement | null;
  if (!data) {
    script?.remove();
    return;
  }
  if (!script) {
    script = document.createElement('script');
    script.id = 'dynamic-jsonld';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}
