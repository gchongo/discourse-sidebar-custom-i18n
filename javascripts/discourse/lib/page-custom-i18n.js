import { ajax } from "discourse/lib/ajax";

const PAGE_KEYS = new Set([
  "about_short",
  "about_extended",
  "faq",
  "guidelines",
  "tos",
  "privacy",
]);

const topicCookedCache = new Map();

function normalizeLocale(locale) {
  return String(locale || "")
    .trim()
    .replace(/-/g, "_")
    .toLowerCase();
}

function localeScore(ruleLocale, currentLocale) {
  const rule = normalizeLocale(ruleLocale);
  const current = normalizeLocale(currentLocale);

  if (!rule || rule === "*") {
    return 1;
  }

  if (rule === current) {
    return 100;
  }

  if (current.startsWith(`${rule}_`)) {
    return 50;
  }

  return 0;
}

/**
 * Build best-matching page overrides for the active locale.
 * Returns Map<pageKey, { html?, topic_id? }>
 */
export function buildPageTranslationIndex(rules, currentLocale) {
  const best = new Map();

  for (const rule of rules || []) {
    const page = String(rule?.page || "").trim();
    if (!PAGE_KEYS.has(page)) {
      continue;
    }

    const html = String(rule?.html ?? "").trim();
    const topicId = Number(rule?.topic_id);
    const hasTopic = Number.isFinite(topicId) && topicId > 0;
    if (!html && !hasTopic) {
      continue;
    }

    const score = localeScore(rule.locale, currentLocale);
    if (score <= 0) {
      continue;
    }

    const previous = best.get(page);
    if (previous && previous.score > score) {
      continue;
    }

    best.set(page, {
      score,
      html: html || null,
      topicId: hasTopic ? topicId : null,
    });
  }

  return best;
}

async function cookedFromTopic(topicId) {
  if (topicCookedCache.has(topicId)) {
    return topicCookedCache.get(topicId);
  }

  try {
    const data = await ajax(`/t/${topicId}.json`);
    const cooked = data?.post_stream?.posts?.[0]?.cooked || "";
    topicCookedCache.set(topicId, cooked);
    return cooked;
  } catch {
    topicCookedCache.set(topicId, null);
    return null;
  }
}

export async function resolvePageHtml(entry) {
  if (!entry) {
    return null;
  }

  if (entry.topicId) {
    const cooked = await cookedFromTopic(entry.topicId);
    if (cooked) {
      return cooked;
    }
  }

  return entry.html || null;
}

export async function applyAboutModelOverrides(about, index) {
  if (!about || !index?.size) {
    return about;
  }

  const shortEntry = index.get("about_short");
  if (shortEntry) {
    const text = await resolvePageHtml(shortEntry);
    if (text) {
      // Short description is plain text in core; strip tags if HTML was pasted.
      const tmp = document.createElement("div");
      tmp.innerHTML = text;
      about.description = tmp.textContent.trim() || text;
    }
  }

  const extendedEntry = index.get("about_extended");
  if (extendedEntry) {
    const html = await resolvePageHtml(extendedEntry);
    if (html) {
      about.extended_site_description = html;
    }
  }

  return about;
}

export async function applyStaticPageOverride(page, pageKey, index) {
  if (!page || !index?.size) {
    return page;
  }

  const entry = index.get(pageKey);
  if (!entry) {
    return page;
  }

  const html = await resolvePageHtml(entry);
  if (html) {
    if (typeof page.set === "function") {
      page.set("html", html);
    } else {
      page.html = html;
    }
  }

  return page;
}

export function staticPageKeyFromRoute(routeName, pageId) {
  if (pageId && PAGE_KEYS.has(pageId)) {
    return pageId;
  }

  switch (routeName) {
    case "faq":
      return "faq";
    case "guidelines":
    case "rules":
    case "conduct":
      return "guidelines";
    case "tos":
      return "tos";
    case "privacy":
      return "privacy";
    default:
      return null;
  }
}
