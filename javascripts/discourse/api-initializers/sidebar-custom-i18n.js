import { apiInitializer } from "discourse/lib/api";
import I18n from "discourse-i18n";
import {
  applySidebarTranslations,
  buildTranslationIndex,
  observeSidebarTranslations,
} from "../lib/sidebar-custom-i18n";

export default apiInitializer((api) => {
  if (!settings.enabled) {
    return;
  }

  const rules = settings.sidebar_translations;
  if (!rules?.length) {
    return;
  }

  let cachedLocale = null;
  let cachedIndex = null;

  const getIndex = () => {
    const locale = I18n.currentLocale();
    if (cachedIndex && cachedLocale === locale) {
      return cachedIndex;
    }

    cachedLocale = locale;
    cachedIndex = buildTranslationIndex(rules, locale);
    return cachedIndex;
  };

  const apply = () => applySidebarTranslations(document, getIndex());

  api.onPageChange(apply);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      observeSidebarTranslations(document, getIndex);
      apply();
    });
  } else {
    observeSidebarTranslations(document, getIndex);
    apply();
  }
});
