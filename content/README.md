# Page content drafts

Starter Markdown for **Guidelines**, **Terms of Service**, and **Privacy** (English + Simplified Chinese).

These files are drafts you can paste into Discourse topics, then point the theme component `page_translations` setting at each topic ID.

## Files

| File | Page | Locale |
|------|------|--------|
| `guidelines.en.md` | guidelines | en |
| `guidelines.zh_CN.md` | guidelines | zh_CN |
| `tos.en.md` | tos | en |
| `tos.zh_CN.md` | tos | zh_CN |
| `privacy.en.md` | privacy | en |
| `privacy.zh_CN.md` | privacy | zh_CN |

## Suggested setup

1. In Discourse, create 6 topics (or 3 topics with language-specific copies — one topic per locale is simplest).  
2. Paste the matching Markdown into each topic’s first post.  
3. In the theme component → **page translations**, add rows like:

| Rule name | Page | Locale | Topic ID |
|-----------|------|--------|----------|
| Guidelines en | `guidelines` | `en` | *(EN topic id)* |
| Guidelines zh | `guidelines` | `zh_CN` | *(ZH topic id)* |
| TOS en | `tos` | `en` | *(EN topic id)* |
| TOS zh | `tos` | `zh_CN` | *(ZH topic id)* |
| Privacy en | `privacy` | `en` | *(EN topic id)* |
| Privacy zh | `privacy` | `zh_CN` | *(ZH topic id)* |

4. Make sure those topics are readable by the audience who should see the pages (usually public).

## Important

- TOS / Privacy drafts are **templates**, not legal advice. Adapt company/operator name, hosting region, cookies/analytics, and have counsel review before publishing.  
- Replace generic wording (“this community” / “本社区”) with your official site name if needed.  
- Do not commit filled-in operator contact details to a public component repo if you want to keep them private — edit only on the live forum topics.  
