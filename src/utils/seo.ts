/**
 * SEO utilities for clean URL navigation, meta tags, and structured data.
 */

/** Navigate to a clean URL path using pushState + popstate dispatch. */
export function navigateTo(path: string): void {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Update document title, meta description, and canonical link. */
export function updatePageMeta(title: string, description: string, canonical?: string): void {
  document.title = title;

  let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  if (metaDesc) {
    metaDesc.content = description;
  }

  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (canonical) {
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;
  } else if (canonicalLink) {
    canonicalLink.href = 'https://openhrapp.com' + window.location.pathname;
  }
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
