# Custom i18n

A Discourse theme component for locale-specific overrides of:

1. **Sidebar** labels (custom sections, external links, plugin entries)
2. **About / FAQ / Guidelines / Terms of Service / Privacy** page content

Discourse stores most of that content in a single language. This component lets you supply per-locale replacements.

## Install

1. Admin → Customize → Themes → Components → Install  
2. Install from Git, or upload this folder  
3. Add the component to your active theme  
4. Enable **enabled**, configure rules, save, then refresh

---

## Sidebar translations

| Field | Meaning |
|------|---------|
| **Rule name** | Unique admin-only label |
| **Match** | Visible text, `data-link-name`, or `data-section-name` |
| **Match by** | `auto` / `text` / `link_name` / `section_name` |
| **Locale** | e.g. `zh_CN`, `en`, or `*` |
| **Translation** | Replacement label for that locale |

Matching is case-insensitive and ignores extra spaces (`LINKS` matches `Links`).

### Example

| Rule name | Match | Match by | Locale | Translation |
|-----------|-------|----------|--------|-------------|
| Section zh | `Resources` | text | `zh_CN` | `资源` |
| Docs zh | `Documentation` | text | `zh_CN` | `文档` |

---

## Page translations

Overrides body content for:

| Page value | Where it applies |
|------------|------------------|
| `about_short` | About page short description |
| `about_extended` | About page extended description |
| `faq` | `/faq` |
| `guidelines` | `/guidelines` (and `/rules`, `/conduct`) |
| `tos` | `/tos` (Terms of Service) |
| `privacy` | `/privacy` |

| Field | Meaning |
|------|---------|
| **Rule name** | Unique admin-only label |
| **Page** | One of the values above |
| **Locale** | e.g. `zh_CN`, `en`, or `*` |
| **HTML / text** | Inline override (`about_short` = plain text; others may be HTML) |
| **Topic ID** | Preferred for long pages — uses the cooked first post of that topic |

Fill **either** `html` **or** `topic_id` (topic wins when both are set and the topic loads).

### Recommended workflow for long pages

1. Create a topic for each language version (or keep language-specific topics)  
2. Note the topic ID from the URL (`/t/slug/123` → `123`)  
3. Add a `page_translations` row with that `page`, `locale`, and `topic_id`

### Example

| Rule name | Page | Locale | HTML / text | Topic ID |
|-----------|------|--------|-------------|----------|
| About blurb zh | `about_short` | `zh_CN` | `欢迎来到本社区` | |
| About blurb en | `about_short` | `en` | `Welcome to this community` | |
| TOS zh | `tos` | `zh_CN` | | `101` |
| TOS en | `tos` | `en` | | `102` |
| Privacy zh | `privacy` | `zh_CN` | | `201` |
| Privacy en | `privacy` | `en` | | `202` |

Nav labels such as “Guidelines” / “Terms of Service” / “Privacy” already follow Discourse UI locale packs. This setting overrides **page body content**, not those built-in nav strings.

### Notes

- If `faq_url`, `tos_url`, or `privacy_policy_url` redirects to an external URL, this component cannot override that destination.  
- Topic IDs must be visible to the visiting user (public or otherwise readable).  
- More specific locales win (`zh_CN` > `zh` > `*`).  
