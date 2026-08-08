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
    const key = rule.match;
    const { matchBy, translation } = rule;

    if (matchBy === "auto" || matchBy === "link_name") {
      byLinkName.set(key, translation);
    }
    if (matchBy === "auto" || matchBy === "section_name") {
      bySectionName.set(key, translation);
    }
    if (matchBy === "auto" || matchBy === "text") {
      byText.set(key, translation);
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
  if (linkName && index.byLinkName.has(linkName)) {
    return index.byLinkName.get(linkName);
  }

  const original = rememberOriginal(textEl);
  if (original && index.byText.has(original)) {
    return index.byText.get(original);
  }

  const current = textEl.textContent.trim();
  if (current && index.byText.has(current)) {
    return index.byText.get(current);
  }

  return null;
}

function resolveSectionTranslation(section, textEl, index) {
  const sectionName = section.getAttribute("data-section-name");
  if (sectionName && index.bySectionName.has(sectionName)) {
    return index.bySectionName.get(sectionName);
  }

  const original = rememberOriginal(textEl);
  if (original && index.byText.has(original)) {
    return index.byText.get(original);
  }

  const current = textEl.textContent.trim();
  if (current && index.byText.has(current)) {
    return index.byText.get(current);
  }

  return null;
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
    index.byText.has(originalTitle) ||
    index.byText.has(currentTitle) ||
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
