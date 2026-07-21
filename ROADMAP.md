# Roadmap — @nera-static/plugin-tags

Planned/possible enhancements. Nothing here is committed work; items are ideas
with enough detail to pick up later.

## Per-language tags and tag pages

**Status:** proposed · **Filed:** 2026-07-21 · **Likely semver:** minor (opt-in)

**Motivation.** Surfaced while building a trilingual site (English/German/Spanish)
with Nera. The plugin currently treats tags as one global namespace, so tags from
German and Spanish pages are merged with English ones: a single tag-overview page
at `/tags/<slug>.html` lists pages from every language, and the tag cloud mixes
languages. On a multilingual site each language should have its own tag pages and
its own cloud.

**Current behaviour** (`index.js`). `getTagCloud` and `getTaggedPages` scan **all**
`pagesData` regardless of `meta.lang`. Generated tag-overview pages are emitted
once under `tag_overview_path` (default `/tags`), `app.tagCloud` is a single global
list, and each page's `meta.tagLinks` point at those global `/tags/<slug>.html`
URLs.

**Proposed behaviour** (opt-in, backward compatible). Add a config switch in
`config/tags.yaml`, e.g.:

```yaml
# default false → today's single-namespace behaviour is unchanged
group_by_lang: false
```

When enabled:

- **Scope tag collection by `meta.lang`.** Tags are counted per language; a tag
  used only on German pages does not appear in the English cloud.
- **Prefix generated tag pages by language**, mirroring the site's URL layout —
  e.g. `/de/tags/<slug>.html`, `/es/tags/<slug>.html`, English staying at
  `/tags/<slug>.html` (or `/en/…` if the site prefixes every language). Each
  generated tag page carries the right `meta.lang` so it renders in that language.
- **Language-aware `meta.tagLinks`.** A German page's tag chips link to the German
  tag pages.
- **Language-aware cloud.** Either `app.tagCloud` becomes `{ en: [...], de: [...],
  es: [...] }`, or expose `app.tagCloudByLang` and keep `app.tagCloud` as the
  default language for backward compatibility.
- **`taggedPages` on an overview page** is filtered to that page's language.

Pages without a `meta.lang` fall into the default language bucket (`app.lang`).

**Template impact.** The published partials (`tag-links`, `tag-cloud`,
`pages/tag-overview`) should keep working unchanged for the single-namespace case.
For the grouped case they read the same `meta.tagLinks` / cloud data, just already
scoped — so no BEM/class changes, keeping this out of major-bump territory.

**Open questions.**
- URL scheme for the default language (root `/tags` vs `/en/tags`) — should follow
  whatever prefixing the host site uses; may need a `lang_path_prefix` hint or
  inference from page `href`s.
- Slug collisions across languages are fine (they are already per-language once
  scoped), but the overview-page image lookup keys (`tag_overview_<slug>_image`)
  may want a per-language variant.

**Acceptance.** A trilingual site produces separate tag clouds and tag pages per
language, with chips linking within the same language; a single-language site
(no `group_by_lang`, or no `meta.lang`) behaves exactly as it does today.
