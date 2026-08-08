import Section from "discourse/lib/sidebar/section";

const ORIGINAL_ATTR = "data-sidebar-i18n-original";
const APPLIED_ATTR = "data-sidebar-i18n-applied";
const TITLE_ORIGINAL_ATTR = "data-sidebar-i18n-title-original";

const ROOT_SELECTORS = [".sidebar-sections", ".sidebar-hamburger-dropdown"];

function normalizeLocale(locale) {
  return String(locale || "")
    .trim()
    .replace(/-/g, "_")
    .toLowerCase();
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parameterizeKey(value) {
  return normalizeKey(value)
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

  // `zh` matches `zh_CN`
  if (current.startsWith(`${rule}_`)) {
    return 50;
  }

  return 0;
}

function normalizeMatchBy(matchBy) {
  const value = String(matchBy || "auto").trim().toLowerCase();
  if (["auto", "text", "link_name", "section_name"].includes(value)) {
    return value;
  }
  return "auto";
}

function setNormalized(map, key, translation) {
  const normalized = normalizeKey(key);
  if (!normalized) {
    return;
  }
  map.set(normalized, translation);

  const parameterized = parameterizeKey(key);
  if (parameterized && parameterized !== normalized) {
    map.set(parameterized, translation);
  }
}

function lookupNormalized(map, ...candidates) {
  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate);
    if (normalized && map.has(normalized)) {
      return map.get(normalized);
    }

    const parameterized = parameterizeKey(candidate);
    if (parameterized && map.has(parameterized)) {
      return map.get(parameterized);
    }
  }
  return null;
}

/**
 * Build lookup indexes for the active locale.
 * Higher-scoring locale rules win; among ties, later rows win.
 */
export function buildTranslationIndex(rules, currentLocale) {
  const byLinkName = new Map();
  const bySectionName = new Map();
  const byText = new Map();

  const ranked = [];

  for (const rule of rules || []) {
    const match = String(rule?.match ?? "").trim();
    const translation = String(rule?.translation ?? "").trim();
    if (!match || !translation) {
      continue;
    }

    const score = localeScore(rule.locale, currentLocale);
    if (score <= 0) {
      continue;
    }

    ranked.push({
      match,
      matchBy: normalizeMatchBy(rule.match_by),
      translation,
      score,
    });
  }

  ranked.sort((a, b) => a.score - b.score);

  for (const rule of ranked) {
    const { match, matchBy, translation } = rule;

    if (matchBy === "auto" || matchBy === "link_name") {
      setNormalized(byLinkName, match, translation);
    }
    if (matchBy === "auto" || matchBy === "section_name") {
      setNormalized(bySectionName, match, translation);
    }
    if (matchBy === "auto" || matchBy === "text") {
      setNormalized(byText, match, translation);
      // Section headers are CSS-uppercased; allow text rules to hit slug/name too.
      setNormalized(bySectionName, match, translation);
    }
  }

  return { byLinkName, bySectionName, byText };
}

function rememberOriginal(el, attr = ORIGINAL_ATTR) {
  if (!el.getAttribute(attr)) {
    el.setAttribute(attr, el.textContent.trim());
  }
  return el.getAttribute(attr);
}

function setTextContent(el, text) {
  if (el.textContent.trim() === text) {
    el.setAttribute(APPLIED_ATTR, text);
    return false;
  }

  el.textContent = text;
  el.setAttribute(APPLIED_ATTR, text);
  return true;
}

function resolveLinkTranslation(link, textEl, index) {
  const linkName = link.getAttribute("data-link-name");
  const listItemName = link
    .closest("[data-list-item-name]")
    ?.getAttribute("data-list-item-name");

  const byName = lookupNormalized(index.byLinkName, linkName, listItemName);
  if (byName) {
    return byName;
  }

  const original = rememberOriginal(textEl);
  const current = textEl.textContent.trim();
  return lookupNormalized(index.byText, original, current);
}

function resolveSectionTranslation(section, textEl, index) {
  const sectionName = section.getAttribute("data-section-name");
  const byName = lookupNormalized(index.bySectionName, sectionName);
  if (byName) {
    return byName;
  }

  const original = rememberOriginal(textEl);
  const current = textEl.textContent.trim();
  return lookupNormalized(index.byText, original, current, sectionName);
}

export function resolveSectionTitle(index, slug, title) {
  if (!index) {
    return null;
  }

  return (
    lookupNormalized(index.bySectionName, slug, title) ||
    lookupNormalized(index.byText, title, slug)
  );
}

export function resolveLinkText(index, name, text) {
  if (!index) {
    return null;
  }

  return (
    lookupNormalized(index.byLinkName, name) ||
    lookupNormalized(index.byText, text, name)
  );
}

function translateLinkTitle(link, translation, index) {
  const currentTitle = link.getAttribute("title");
  if (currentTitle == null || currentTitle === "") {
    return;
  }

  if (!link.getAttribute(TITLE_ORIGINAL_ATTR)) {
    link.setAttribute(TITLE_ORIGINAL_ATTR, currentTitle);
  }

  const originalTitle = link.getAttribute(TITLE_ORIGINAL_ATTR);
  const shouldReplace =
    originalTitle === currentTitle ||
    lookupNormalized(index.byText, originalTitle, currentTitle) ||
    currentTitle === translation;

  if (shouldReplace && currentTitle !== translation) {
    link.setAttribute("title", translation);
  }
}

function applyLinks(root, index) {
  root
    .querySelectorAll(".sidebar-section-link[data-link-name]")
    .forEach((link) => {
      const textEl = link.querySelector(".sidebar-section-link-content-text");
      if (!textEl) {
        return;
      }

      const translation = resolveLinkTranslation(link, textEl, index);
      if (!translation) {
        return;
      }

      rememberOriginal(textEl);
      setTextContent(textEl, translation);
      translateLinkTitle(link, translation, index);
    });
}

function applySections(root, index) {
  root
    .querySelectorAll(".sidebar-section-wrapper[data-section-name]")
    .forEach((section) => {
      const textEl = section.querySelector(".sidebar-section-header-text");
      if (!textEl) {
        return;
      }

      const translation = resolveSectionTranslation(section, textEl, index);
      if (!translation) {
        return;
      }

      rememberOriginal(textEl);
      setTextContent(textEl, translation);
    });
}

export function applySidebarTranslations(doc, index) {
  if (!index) {
    return;
  }

  for (const selector of ROOT_SELECTORS) {
    doc.querySelectorAll(selector).forEach((root) => {
      applySections(root, index);
      applyLinks(root, index);
    });
  }
}

function wrapSectionLink(link, getIndex) {
  if (!link || link.__sidebarCustomI18nWrapped) {
    return link;
  }

  const originalText = link.text;
  let storedText = originalText;

  Object.defineProperty(link, "text", {
    configurable: true,
    enumerable: true,
    get() {
      return (
        resolveLinkText(getIndex(), link.name, storedText) ?? storedText
      );
    },
    set(value) {
      storedText = value;
    },
  });

  link.__sidebarCustomI18nWrapped = true;
  return link;
}

export function installSidebarClassPatches(getIndex) {
  if (!Section.prototype.__sidebarCustomI18nTitlePatched) {
    const descriptor = Object.getOwnPropertyDescriptor(
      Section.prototype,
      "decoratedTitle"
    );

    if (descriptor?.get) {
      Object.defineProperty(Section.prototype, "decoratedTitle", {
        configurable: true,
        enumerable: descriptor.enumerable,
        get() {
          const original = descriptor.get.call(this);
          return (
            resolveSectionTitle(getIndex(), this.slug, original) ?? original
          );
        },
      });
      Section.prototype.__sidebarCustomI18nTitlePatched = true;
    }
  }

  if (!Section.prototype.__sidebarCustomI18nLinksPatched) {
    const linksDescriptor = Object.getOwnPropertyDescriptor(
      Section.prototype,
      "links"
    );

    // @autoTrackedArray installs get/set; wrap setter so custom links get translated text.
    if (linksDescriptor?.set && linksDescriptor?.get) {
      Object.defineProperty(Section.prototype, "links", {
        configurable: true,
        enumerable: linksDescriptor.enumerable,
        get() {
          return linksDescriptor.get.call(this);
        },
        set(value) {
          const wrapped = Array.isArray(value)
            ? value.map((link) => wrapSectionLink(link, getIndex))
            : value;
          linksDescriptor.set.call(this, wrapped);
        },
      });
      Section.prototype.__sidebarCustomI18nLinksPatched = true;
    }
  }
}

function nodeContainsSidebarRoot(node) {
  if (node?.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  return ROOT_SELECTORS.some(
    (selector) => node.matches?.(selector) || node.querySelector?.(selector)
  );
}

export function observeSidebarTranslations(doc, getIndex) {
  let scheduled = false;

  const run = () => {
    scheduled = false;
    applySidebarTranslations(doc, getIndex());
  };

  const schedule = () => {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(run);
  };

  const observer = new MutationObserver(schedule);

  const attach = () => {
    let attachedNewRoot = false;

    for (const selector of ROOT_SELECTORS) {
      doc.querySelectorAll(selector).forEach((root) => {
        if (root.dataset.sidebarI18nObserving === "true") {
          return;
        }
        root.dataset.sidebarI18nObserving = "true";
        observer.observe(root, {
          childList: true,
          subtree: true,
          characterData: true,
        });
        attachedNewRoot = true;
      });
    }

    if (attachedNewRoot) {
      schedule();
    }
  };

  attach();
  schedule();

  const bodyObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (nodeContainsSidebarRoot(node)) {
          attach();
          return;
        }
      }
    }
  });

  if (doc.body) {
    bodyObserver.observe(doc.body, { childList: true, subtree: true });
  }

  return () => {
    observer.disconnect();
    bodyObserver.disconnect();
  };
}
