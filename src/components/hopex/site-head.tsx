import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect } from "react";

/** Applies admin-controlled branding + SEO tags to the live document head. */
function upsertMeta(selector: string, attrs: Record<string, string>) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
}

/** The default browser-tab icon (falls back to the static logo). */
const DEFAULT_ICON = "/logo.svg";

/**
 * Mirrors the original SiteHead — watches the admin-editable settings and keeps
 * the document title, favicon, meta description/keywords and Open Graph tags in
 * sync. This is what makes "Change favicon / SEO" in the Admin panel actually
 * take effect on the live site.
 */
export function SiteHead() {
  const settings = useQuery(api.settings.getPublicSettings);

  useEffect(() => {
    if (typeof document === "undefined" || !settings) return;
    const s = settings;

    if (s.siteTitle) document.title = s.siteTitle;
    else if (s.siteName) document.title = `${s.siteName} — Investment Platform`;

    if (s.seoDescription) {
      upsertMeta('meta[name="description"]', { name: "description", content: s.seoDescription });
      upsertMeta('meta[property="og:description"]', {
        property: "og:description",
        content: s.seoDescription,
      });
    }
    if (s.seoKeywords)
      upsertMeta('meta[name="keywords"]', { name: "keywords", content: s.seoKeywords });
    if (s.siteTitle)
      upsertMeta('meta[property="og:title"]', { property: "og:title", content: s.siteTitle });

    const image = s.ogImage || s.siteLogo;
    if (image) {
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
    }

    const icon = s.siteFavicon || s.siteLogo || DEFAULT_ICON;
    const custom = Boolean(s.siteFavicon || s.siteLogo);
    // When an admin-set favicon exists, replace every icon link so it takes
    // precedence over the static /logo.svg link in index.html.
    if (custom) {
      document.head
        .querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')
        .forEach((l) => l.remove());
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.href = icon;
      document.head.appendChild(link);
      const apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      apple.href = icon;
      document.head.appendChild(apple);
    }
  }, [
    settings?.siteTitle,
    settings?.siteName,
    settings?.seoDescription,
    settings?.seoKeywords,
    settings?.ogImage,
    settings?.siteLogo,
    settings?.siteFavicon,
  ]);

  return null;
}
