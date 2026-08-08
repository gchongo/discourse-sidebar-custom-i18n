# Sidebar Custom i18n

A Discourse theme component that lets admins override sidebar labels by locale — useful for custom section titles, external links, and plugin entries that Discourse does not translate automatically.

## Install

1. Admin → Customize → Themes → Components → Install  
2. Install from Git, or upload this folder  
3. Add the component to your active theme  
4. Enable **enabled**, add rules under **sidebar translations**, save, then refresh

## Settings

| Field | Meaning |
|------|---------|
| **Rule name** | Unique admin-only label for the row (e.g. `Docs link (zh_CN)`) |
| **Match** | Current visible text, or `data-link-name` / `data-section-name` |
| **Match by** | `auto` (default), `text`, `link_name`, or `section_name` |
| **Locale** | Target locale such as `zh_CN` or `en` (`*` = every locale) |
| **Translation** | Text to show when the interface language matches **Locale** |

**Match** is the sidebar source string (visible label, `data-link-name`, or `data-section-name`). Matching is case-insensitive and ignores extra spaces, so `LINKS` matches a section whose real title is `Links` (Discourse uppercases section headers with CSS).

Add one row per locale when you need different labels for Chinese and English.

### Finding Match values

1. Right-click a sidebar item → Inspect  
2. Links: use `data-link-name="..."` (stable) or the visible label with `text`  
3. Section headers: use `data-section-name="..."` on the section wrapper, or the visible title with `text`

## Examples

Translate a custom section title and an external link when the UI is Chinese:

| Rule name | Match | Match by | Locale | Translation |
|-----------|-------|----------|--------|-------------|
| Section title zh | `Resources` | text | `zh_CN` | `资源` |
| Docs link zh | `Documentation` | text | `zh_CN` | `文档` |

Opposite case — stored labels are Chinese, but English UI should show English:

| Rule name | Match | Match by | Locale | Translation |
|-----------|-------|----------|--------|-------------|
| Ranking en | `示例入口` | text | `en` | `Example link` |

Prefer a stable plugin `data-link-name` when you know it:

| Rule name | Match | Match by | Locale | Translation |
|-----------|-------|----------|--------|-------------|
| Plugin zh | `my-plugin-link` | link_name | `zh_CN` | `我的插件` |
| Plugin en | `my-plugin-link` | link_name | `en` | `My plugin` |

## Notes

- Affects the sidebar only (including the mobile hamburger menu copy of the same nav). It does not change page titles or in-plugin UI strings.  
- After Ember re-renders the sidebar, translations are reapplied automatically.  
- When multiple rules match, a more specific locale wins (`zh_CN` > `zh` > `*`). Ties favor the later row.  
