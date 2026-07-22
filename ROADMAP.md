# Roadmap — @nera-static/plugin-tags

Planned/possible enhancements — ideas with enough detail to pick up later.

**Everything filed here so far has shipped.** The one item below is done and
deployed end to end, so this file currently reads as a design record rather than
a plan. Keep the record: the reasoning behind what was built, and the two
alternatives that were built and then dropped, is why nobody has to re-derive
them. New items go above the resolved one.

## Per-language tags and tag pages

**Status:** ✅ complete — implemented in 3.2.0 (2026-07-21), wired into
`nera-website` and verified in its build (2026-07-22) · **Filed:** 2026-07-21 ·
**Semver:** minor (opt-in)

> Shipped and deployed. The sections below are kept as the design record; see
> "Resolved 2026-07-21" for what was actually built, including the two open
> questions' answers and one behaviour the proposal did not anticipate, and
> "Closed out 2026-07-22" for the reference-site wiring and the documentation
> gap that followed it.

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

### Context added 2026-07-21

Three things changed after the proposal above was written. They do not alter the
design, but the reference site no longer matches the defaults the text assumes.

**The reference site moved its tag pages.** `nera-website` — the trilingual
dogfood site this proposal came from — now sets
`tag_overview_path: '/tutorials/tags'`, so its overviews are generated at
`/tutorials/tags/<slug>.html`, not at the default `/tags/<slug>.html` the
sections above describe. Anything asserting URLs against that site must account
for the configured prefix, and the language segment has to compose with it:
presumably `/de/tutorials/tags/<slug>.html`. Where the language segment belongs
relative to a configured `tag_overview_path` is an open question the proposal
does not yet answer — prefixing the whole configured path is the obvious
reading, but it is a decision, not a given.

**The site's tag pages are currently English-rooted.** All 12 generated
overviews live under the unprefixed path, so a German reader following a tag
chip lands on an English-rooted page listing pages from every language. That is
the concrete symptom motivating this work, and the thing to verify is fixed.

**Navigation now depends on where these pages sit.**
`@nera-static/plugin-navigation` 2.4.1 marks a nav entry with the active-path
class when the current page sits anywhere inside that entry's section, at any
depth (2.4.0 and earlier only matched one level down). That is what makes
`/tutorials/tags/links.html` highlight *Tutorials*. Per-language pages will sit
at a different depth again, so re-check that highlighting still holds once the
paths change — a page at `/de/tutorials/tags/<slug>.html` needs the German
Tutorials entry marked, which also requires the host site to pass its language
prefix as the mixin's `rootPath` argument.

**Working agreement.** Develop and validate inside this repo: the existing
integration tests build a throwaway project in a temp directory (see how
`plugin-navigation` does it), which is enough to prove per-language grouping
without touching `nera-website`. Wiring a new version into that site — its
`config/tags.yaml`, its vendored templates under
`views/vendor/plugin-tags/`, its `package.json` — is a separate follow-up step,
so two streams of work do not edit the same files at once.

Note that `publishTemplates` skips a `views/vendor/plugin-tags/` that already
exists, so any site that published templates before will need
`npx nera-tags --force` to pick up changed partials.

### Resolved 2026-07-21 — shipped in 3.2.0

Implemented behind `group_by_lang: false`, so nothing changes for a site that
does not opt in. `test/group-by-lang.test.js` covers it against a trilingual
fixture, including both modes and the shipped partials.

**Open question — where the language segment goes.** Decided: it prefixes the
**whole** configured `tag_overview_path`, so the reference site's overviews
land at `/de/tutorials/tags/<slug>.html`. This is what keeps tag pages inside
the same language tree as the rest of the site, which is also what navigation's
active-path matching needs. The segment is the page's `lang` itself — the same
code the site already uses for its directories (`pages/de/…`) — and the default
language is left unprefixed, with `prefix_default_lang: true` opting into
`/en/…` for sites that give every language a directory.

A configurable per-language segment (`lang_path_prefixes`, floated in the open
questions above as a possible `lang_path_prefix` hint) was built and then
**dropped before release**. No site can serve two languages from one segment,
so its only distinguishing feature — pointing two languages at one path — was
not a use case, and the reference site's `lang` values already equal its
directory names. Add it later if a site with locale-style codes (`de-DE` served
from `/de/`) actually turns up.

**Open question — image lookup keys.** Decided: yes, per-language, with
fallback. `tag_overview_<lang>_<slug>_image` → `tag_overview_<slug>_image` →
`tag_overview_<tag>_image` → `tag_overview_<lang>_default_image` →
`tag_overview_default_image`.

**Cloud shape.** `app.tagCloud` keeps its flat-array shape (default language
when grouping, everything when not), `app.tagCloudByLang` is the keyed map, and
each page carries a `meta.tagCloud` already scoped to its language. The shipped
`tag-cloud` partial reads `meta.tagCloud || app.tagCloud`, so one partial
serves both modes with no BEM or markup change — which is what kept this a
minor bump.

**No new frontmatter key.** Pages already carry `lang:` — the site sets it on
all 63 of them — so the plugin reads `meta.lang` and falls back to `app.lang`.
A tags-specific key would be a second source of truth for the same fact, to be
kept in sync by hand in every file.

**Grouping is keyed by language, and that is the whole model.** An intermediate
implementation keyed it by *resolved path* instead, to guarantee two languages
could never emit two tag pages to one output file. Once the segment became the
language code that was unreachable except through malformed frontmatter, so the
guard, its warning and its helpers were removed — about 70 lines that made the
code say something more complicated than the feature is. `getPagesByLang` is
now 15 lines, and single-namespace mode is the same function with one group.

### Closed out 2026-07-22

**The reference-site wiring is done, and verified from the committed build** —
not from the site's config alone, which only proves intent.
`nera-website/config/tags.yaml` sets `group_by_lang: true` with
`tag_overview_path: '/tutorials/tags'` and no `prefix_default_lang` (English is
served from the root), and `views/vendor/plugin-tags/` has been refreshed. The
build carries the same five tag pages under all three languages —
`public/tutorials/tags/`, `public/de/tutorials/tags/`,
`public/es/tutorials/tags/` — which is the acceptance criterion above.

**The navigation re-check passed.** This was the open risk: per-language tag
pages sit at a new depth, so the active-path highlighting had to be confirmed
rather than assumed. On `/de/tutorials/tags/links.html` the German *Tutorials*
entry renders as
`class="nav__link nav__link--active-path" href="/de/tutorials/index.html"`, so
the site is passing its language prefix as the mixin's `rootPath` correctly.

**No version bump is owed.** The site depends on `^3.2.0`, which already
resolves to the current 3.2.2; its lockfile still pins 3.2.0, so a routine
`npm install` there picks up 3.2.1's shared-`slugify` refactor and 3.2.2's
documentation. Slugs are byte-identical across all three, so no tag URL moves.

**One gap this work left, now fixed in 3.2.2.** The feature shipped correctly
and was documented in the README's per-language section, but the audit in
`audit/readme/README-tags.md` found that `app.tagCloudByLang` was described as
if it were gated on `group_by_lang` when the code writes it in both modes, and
that `meta.tag` / `meta.tagSlug` on generated pages — which the per-language
image lookup depends on — were documented nowhere at all. Worth noting as a
pattern rather than a one-off: **the design record above was accurate and the
user-facing docs still drifted**, because a feature's own section gets written
and the shared data-contract section does not get revisited.

**If a follow-up does turn up**, the two deliberately-dropped alternatives are
`lang_path_prefixes` (a configurable per-language segment — see above for why it
was cut) and path-keyed grouping. Neither should be rebuilt without a real site
that needs it.
