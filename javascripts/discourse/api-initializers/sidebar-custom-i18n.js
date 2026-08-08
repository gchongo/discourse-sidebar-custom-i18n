import { schedule } from "@ember/runloop";
import { apiInitializer } from "discourse/lib/api";
import I18n from "discourse-i18n";
import {
  applyAboutModelOverrides,
  applyStaticPageOverride,
  buildPageTranslationIndex,
  staticPageKeyFromRoute,
} from "../lib/page-custom-i18n";
import {
  applySidebarTranslations,
  buildTranslationIndex,
  installSidebarClassPatches,
  observeSidebarTranslations,
} from "../lib/sidebar-custom-i18n";

export default apiInitializer((api) => {
  if (!settings.enabled) {
    return;
  }

  const sidebarRules = settings.sidebar_translations || [];
  const pageRules = settings.page_translations || [];
  const hasSidebar = sidebarRules.length > 0;
  const hasPages = pageRules.length > 0;

  if (!hasSidebar && !hasPages) {
    return;
  }

  let cachedLocale = null;
  let cachedSidebarIndex = null;
  let cachedPageIndex = null;

  const currentLocale = () => I18n.currentLocale();

  const getSidebarIndex = () => {
    const locale = currentLocale();
    if (cachedSidebarIndex && cachedLocale === locale) {
      return cachedSidebarIndex;
    }

    cachedLocale = locale;
    cachedSidebarIndex = buildTranslationIndex(sidebarRules, locale);
    cachedPageIndex = buildPageTranslationIndex(pageRules, locale);
    return cachedSidebarIndex;
  };

  const getPageIndex = () => {
    const locale = currentLocale();
    if (cachedPageIndex && cachedLocale === locale) {
      return cachedPageIndex;
    }

    cachedLocale = locale;
    cachedSidebarIndex = buildTranslationIndex(sidebarRules, locale);
    cachedPageIndex = buildPageTranslationIndex(pageRules, locale);
    return cachedPageIndex;
  };

  if (hasSidebar) {
    installSidebarClassPatches(getSidebarIndex);

    const applySidebar = () => {
      schedule("afterRender", () => {
        applySidebarTranslations(document, getSidebarIndex());
      });
    };

    api.onPageChange(applySidebar);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        observeSidebarTranslations(document, getSidebarIndex);
        applySidebar();
      });
    } else {
      observeSidebarTranslations(document, getSidebarIndex);
      applySidebar();
    }
  }

  if (hasPages) {
    api.modifyClass("route:about", {
      pluginId: "discourse-custom-i18n",
      async model() {
        const about = await this._super(...arguments);
        return await applyAboutModelOverrides(about, getPageIndex());
      },
    });

    const patchStaticRoute = (resolverName) => {
      api.modifyClass(resolverName, {
        pluginId: "discourse-custom-i18n",
        async model() {
          const page = await this._super(...arguments);
          const pageKey = staticPageKeyFromRoute(
            resolverName.replace(/^route:/, ""),
            this.pageId
          );
          return await applyStaticPageOverride(page, pageKey, getPageIndex());
        },
      });
    };

    patchStaticRoute("route:faq");
    patchStaticRoute("route:guidelines");
    patchStaticRoute("route:rules");
    patchStaticRoute("route:conduct");
    patchStaticRoute("route:tos");
    patchStaticRoute("route:privacy");
  }
});
