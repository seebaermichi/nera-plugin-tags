# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.0] - 2026-07-21

### Added

-   `group_by_lang` (default `false`): collect tags per `meta.lang` instead of
    in one global namespace. Each language gets its own tag pages, its own
    cloud, and tag chips that link within the same language. Pages without
    `meta.lang` belong to the site's default language (`app.lang`)
-   `prefix_default_lang` (default `false`), which controls whether the default
    language's tag pages get a URL segment of their own. Every other language
    is prefixed with its `lang` in front of the whole `tag_overview_path`, so
    `de` + `/tutorials/tags` gives `/de/tutorials/tags/<slug>.html`
-   `app.tagCloudByLang`, a `{ <lang>: [...] }` map of every language's cloud.
    Present in both modes; with grouping off it holds the single namespace
    under the default language key
-   `meta.tagCloud` on every page, scoped to that page's language. Only added
    when `group_by_lang` is enabled
-   `meta.lang` on generated tag pages, so they render in their own language
-   language-qualified tag image config keys —
    `tag_overview_<lang>_<slug>_image` and `tag_overview_<lang>_default_image`
    — which take precedence over the language-agnostic keys

### Changed

-   the shipped `partials/tag-cloud.pug` renders `meta.tagCloud` when present
    and falls back to `app.tagCloud`, and `pages/tag-overview.pug` prefers a
    language-qualified image key and formats dates in the page's own language.
    No markup or BEM class changed, but sites that published templates before
    need `npx nera-tags --force` to pick these up
-   `app.tagCloud` is unchanged with grouping off; with grouping on it holds
    the default language's cloud, keeping its flat-array shape


## [3.1.0] - 2026-07-21

### Changed

-   raised minimum Node from 18 to 20; Node 18 reached end-of-life on
    2025-04-30 and the dev toolchain requires Node 20+


## [3.0.0] - 2026-07-19

### Fixed

-   **BREAKING**: generated tag pages are written to `public/tags/<slug>.html`
    instead of a single `public/tags/undefined` file. Generated page meta now
    carries `filename`, `dirname` and `fullPath`, derived from the same href
    the tag links point at, so no tag link can 404 against its own page
-   **BREAKING**: tag URLs are slugified and case-folded, so `CSS` and `css`
    resolve to one page listing every page tagged either way
-   **BREAKING**: the shipped `views/pages/tag-overview.pug` no longer reads
    `app.tagsConfig` unguarded. Using it as `tag_overview_layout` previously
    failed the whole build with `Cannot read properties of undefined`
-   `tags` frontmatter accepts a YAML list (`tags: [css, js]`) as well as a
    separated string. The list form previously threw `tags.split is not a
    function` and aborted the build; non-string scalars such as `tags: 2024`
    are coerced rather than throwing
-   `tag_overview_meta.layout` is honoured instead of being silently
    overridden by `tag_overview_layout`, as `README.md` has always documented
-   `getMetaData` no longer mutates the `pagesData` array it is given
-   `tag_overview_path` is normalized, so `tags`, `/tags` and `/tags/` all
    produce the same hrefs

### Added

-   `app.tagsConfig` exposes `config/tags.yaml`, making the documented
    `tag_overview_default_image` and `tag_overview_<tag>_image` keys work
-   `slug` on every `app.tagCloud` and `meta.tagLinks` entry, and `tagSlug` on
    generated pages, so templates can address a tag by its URL token
-   `--force` on `publish-template`, to overwrite an existing
    `views/vendor/plugin-tags/` (requires `@nera-static/plugin-utils@^1.2.0`)

### Changed

-   Configuration is read inside the hooks rather than at module load, so a
    host that changes directory between import and render is handled correctly

### Migration from v2.x

**Tag overview pages did not work at all in 2.x** — every one of them was
written to the single file `public/tags/undefined`, so no tag URL ever
resolved. Nothing that currently serves can break; what changes is the set of
hrefs the plugin emits into your pages.

Tag hrefs were already lowercased in 2.x, so a tag that is a single
alphanumeric word is unaffected. Anything else changes:

| Tag in frontmatter | 2.x href | 3.0.0 href |
|---|---|---|
| `javascript` | `/tags/javascript.html` | `/tags/javascript.html` (unchanged) |
| `JavaScript` | `/tags/javascript.html` | `/tags/javascript.html` (unchanged) |
| `web development` | `/tags/web development.html` | `/tags/web-development.html` |
| `vue.js` | `/tags/vue.js.html` | `/tags/vue-js.html` |
| `C++` | `/tags/c++.html` | `/tags/c.html` |
| `Übergrößen` | `/tags/übergrößen.html` | `/tags/ubergrossen.html` |

`JavaScript` and `javascript` previously produced **two** overview pages that
claimed the same href, each listing only the pages matching its exact casing.
They now produce **one** page listing both. The displayed tag name is the
alphabetically first variant found, so a site using both `CSS` and `css` shows
`css`; pick one spelling in your frontmatter if you want the other.

Two things need action on your side:

1.  **Re-publish the templates.** `publish-template` skips a directory that
    already exists, so an existing `views/vendor/plugin-tags/` keeps the 2.x
    `tag-overview.pug` — including the unguarded `app.tagsConfig` read that
    breaks the build. Run `npx nera-tags --force`, or delete the directory
    first. If you have edited your copy, re-apply your changes afterwards.
2.  **Rename any `tag_overview_<tag>_image` key to use the slug.** The lookup
    is now `tag_overview_web-development_image`, not
    `tag_overview_web development_image` — which YAML could not express in the
    first place. The un-slugged key is still accepted as a fallback, so
    single-word tags need no change.

If you hardcoded a tag URL anywhere, or styled one via a URL selector, update
it using the table above. The BEM class names are unchanged.

## [2.0.0] - 2025-07-20

### Added

-   **BREAKING**: Complete rewrite for Nera v4.1.0 compatibility
-   Professional CHANGELOG.md for release tracking
-   Enhanced template publishing system via `@nera-static/plugin-utils@^1.1.0`
-   BEM CSS methodology for all tag templates:
    -   `.tag-cloud` and `.tag-cloud__item` classes
    -   `.tag-links` and `.tag-links__item` classes
    -   `.tag-overview` with semantic sub-elements
-   Comprehensive test suite with 20 tests covering:
    -   Unit tests for core tag functionality
    -   Integration tests for template publishing
    -   Template rendering tests for all Pug templates
-   CLI tool `npx @nera-static/plugin-tags run publish-template` for template publishing
-   ESLint configuration with modern JavaScript standards
-   Support for custom tag separators (comma, pipe, etc.)
-   Tag-specific image configuration for overview pages
-   Proper URL-safe tag generation (spaces to hyphens, lowercase)

### Changed

-   **BREAKING**: Migrated from CommonJS to ES modules
-   **BREAKING**: Package name changed to `@nera-static/plugin-tags`
-   **BREAKING**: Now uses `@nera-static/plugin-utils` instead of legacy configuration loading
-   **BREAKING**: Configuration loading moved from plugin directory to project root
-   Enhanced package.json with modern configuration and proper dependencies
-   Improved tag overview template structure with semantic HTML
-   Updated all templates to use BEM CSS methodology
-   Enhanced README.md with comprehensive documentation following plugin standards

### Fixed

-   **Critical Fix**: Configuration now loads from project's `config/tags.yaml` instead of plugin directory
-   Template rendering properly handles missing images and empty tag lists
-   Tag cloud generation now correctly deduplicates and sorts tags alphabetically
-   Tag overview pages properly sort tagged content by creation date (newest first)

### Technical Details

-   Migrated to ES modules with proper `import`/`export` syntax
-   Uses modern `getAppData()` and `getMetaData()` exports for Nera v4.1.0
-   Leverages `@nera-static/plugin-utils` for configuration and template publishing
-   All templates follow BEM CSS naming conventions for better maintainability
-   Comprehensive test coverage using Vitest testing framework
-   Proper semantic versioning and npm package structure

### Template Structure

Templates now use standardized BEM CSS classes:

```
views/vendor/plugin-tags/
├── pages/
│   └── tag-overview.pug          # .tag-overview, .tag-overview__header, etc.
└── partials/
    ├── tag-cloud.pug             # .tag-cloud, .tag-cloud__item
    └── tag-links.pug             # .tag-links, .tag-links__item
```

### Migration from v1.x

1. Update package name: `@nera-static/plugin-tags`
2. Move `config/tags.yaml` to project root if using custom configuration
3. Update template includes to use `/vendor/plugin-tags/` paths
4. Update CSS to use new BEM class names
5. Use `npx @nera-static/plugin-tags run publish-template` instead of manual copying

## [1.x.x] - Legacy Versions

Previous versions were part of the original Nera plugin ecosystem before the v4.1.0 modernization. See git history for detailed changes in legacy versions.
