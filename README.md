# @nera-static/plugin-tags

[![Test](https://github.com/seebaermichi/nera-plugin-tags/actions/workflows/test.yml/badge.svg)](https://github.com/seebaermichi/nera-plugin-tags/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/@nera-static/plugin-tags)](https://www.npmjs.com/package/@nera-static/plugin-tags)

A plugin for the [Nera](https://github.com/seebaermichi/nera) static site generator that creates tag clouds, tag links, and tag overview pages from page tags. Perfect for content organization, taxonomy management, and content discovery.

## ✨ Features

- Filter and organize content by tags
- Automatic tag cloud generation with alphabetical sorting
- Clickable tag links for each page
- Individual tag overview pages with all tagged content
- Access all tag data globally via `app.tagCloud` and `meta.tagLinks`
- Optional per-language tags, tag pages and clouds for multilingual sites
- Includes ready-to-use Pug templates with BEM CSS methodology
- Template publishing system for easy customization
- Configurable tag separators, paths, and layouts
- Case-folded, slugified tag URLs — `CSS` and `css` share one page
- Tags may be written as a separated string or a YAML list
- Lightweight and zero-runtime overhead
- Works with Nera v4.3.0+ as documented here (the plugin itself needs only the
  4.x baseline — see [Compatibility](#-compatibility))

## 🚀 Installation

Install the plugin in your Nera project:

```bash
npm install @nera-static/plugin-tags
```

Nera will automatically detect the plugin and apply tag processing during the build.

## ⚙️ Configuration

The plugin uses `config/tags.yaml` to configure tag behavior. **Every key is
optional and the file itself is too** — the values below are the defaults, and
with no `config/tags.yaml` at all the plugin runs exactly as shown here:

```yaml
# Meta property name containing tags (default: 'tags')
meta_property_name: tags

# Tag separator (default: ',')
tag_separator: ','

# Base path for tag overview pages (default: '/tags')
tag_overview_path: '/tags'

# Multilingual sites: one tag namespace per language (default: false)
group_by_lang: false

# Only read when group_by_lang is true (default: false)
prefix_default_lang: false

# Layout template for tag overview pages (default: 'pages/default.pug')
tag_overview_layout: 'pages/default.pug'

# Additional meta properties for tag overview pages
tag_overview_meta:
  description: 'Browse content by tag'
  layout: 'pages/tag-layout.pug'

# Optional: Tag-specific images, keyed by the tag's slug
tag_overview_default_image: '/images/tags/default.jpg'
tag_overview_javascript_image: '/images/tags/js-logo.jpg'
tag_overview_web-development_image: '/images/tags/webdev.jpg'
```

A `layout` inside `tag_overview_meta` **wins over** `tag_overview_layout`. Set
one or the other; the block above sets both only to show where each goes.

### Tag images

The `tag_overview_*_image` keys are the one part of this file the plugin does
not read itself. It forwards the whole config to templates as `app.tagsConfig`,
and the shipped `pages/tag-overview.pug` is what resolves the image — so if you
replace that template with your own markup, these keys do nothing until your
template reads `app.tagsConfig` too.

The lookup uses the tag's slug (see [Generated Output](#-generated-output)), so a
multi-word tag such as `web development` is configured as
`tag_overview_web-development_image`. Keys are tried most specific first:

1. `tag_overview_<lang>_<slug>_image`
2. `tag_overview_<slug>_image`
3. `tag_overview_<tag>_image` — the un-slugged tag name, kept as a fallback so
   configs written before 3.0.0 keep working for single-word tags
4. `tag_overview_<lang>_default_image`
5. `tag_overview_default_image`

The language-qualified forms are only useful together with
[per-language tags](#-per-language-tags).

## 🧩 Usage

### Mark content with tags

Add tags to your Markdown files using frontmatter:

```yaml
---
title: Getting Started with JavaScript
description: Learn the basics of JavaScript programming
tags: javascript, programming, web development, frontend
---

# Getting Started with JavaScript

Your content here...
```

A YAML list works just as well, and avoids the separator entirely:

```yaml
---
title: CSS Grid Layout Guide
description: Master CSS Grid for modern web layouts
tags:
    - css
    - layout
    - web development
---

# CSS Grid Layout Guide

More content...
```

Entries that are neither a string nor a number — a nested YAML mapping, say —
are skipped with a warning rather than taken down the build, as is any tag with
no URL-safe characters at all (see [Generated Output](#-generated-output)).

### Access in your templates

The plugin makes tag data available in multiple ways:

#### 1. Global tag cloud via `app.tagCloud`

Display all available tags:

```pug
// Display tag cloud
if app.tagCloud.length > 0
    section.tag-cloud
        h2 Browse by Tag
        each tag in app.tagCloud
            a.tag-cloud__item(href=tag.href) #{tag.name}
```

#### 2. Page-specific tag links via `meta.tagLinks`

Show tags for the current page:

```pug
// Display page tags
if meta.tagLinks.length > 0
    section.tag-links
        span Tags:
        each tag in meta.tagLinks
            a.tag-links__item(href=tag.href) #{tag.name}
```

#### 3. Tag overview pages via generated routes

Each tag gets its own page with tagged content:

```pug
// In tag overview layout
section.tag-overview
    header.tag-overview__header
        h1.tag-overview__title #{meta.title}

    if meta.taggedPages.length > 0
        section.tag-overview__content
            each page in meta.taggedPages
                article.tag-overview__item
                    h2.tag-overview__item-title #{page.meta.title}
                    p.tag-overview__item-description #{page.meta.description}
                    a.tag-overview__item-link(href=page.meta.href) Read more
```

Generated tag pages carry more than `taggedPages`, and a layout of your own can
read all of it:

| Key | Value |
|---|---|
| `meta.tag` | the tag exactly as authored, e.g. `web development` |
| `meta.tagSlug` | its URL token, e.g. `web-development` — this is what the image config keys are looked up by |
| `meta.title` | same as `meta.tag`, so a shared layout's `h1` works unchanged |
| `meta.taggedPages` | the pages carrying this tag, newest first |
| `meta.lang` | the page's language — **only** when `group_by_lang` is on |
| `meta.href` / `dirname` / `filename` / `fullPath` | the usual generator page keys, derived from the tag's href |

`meta.tagLinks` is `[]` on a generated tag page, so including the `tag-links`
partial in a shared layout renders nothing there rather than failing.

### Available data structure

**Tag cloud items (`app.tagCloud`)**:
```javascript
[
    {
        name: "javascript",
        slug: "javascript",
        href: "/tags/javascript.html"
    },
    {
        name: "web development",
        slug: "web-development",
        href: "/tags/web-development.html"
    }
]
```

**Page tag links (`meta.tagLinks`)**:
```javascript
[
    {
        name: "javascript",
        slug: "javascript",
        href: "/tags/javascript.html"
    },
    {
        name: "programming",
        slug: "programming",
        href: "/tags/programming.html"
    }
]
```

**Tag overview page data (`meta.taggedPages`)**:

Entries are the page objects themselves, so `content` — the page's rendered
HTML — is available alongside `meta` if you want an excerpt. The list is sorted
by `createdAt`, newest first.

```javascript
[
    {
        content: "<p>Rendered page HTML…</p>",
        meta: {
            title: "Getting Started with JavaScript",
            description: "Learn the basics...",
            href: "/articles/js-basics.html",
            createdAt: Date
        }
    }
]
```

## 🌍 Per-language tags

By default every page on the site shares one tag namespace. On a multilingual
site that merges languages: one `/tags/links.html` lists English, German and
Spanish pages together, and the tag cloud mixes all three.

Enable `group_by_lang` to give each language its own tags, tag pages and cloud:

```yaml
group_by_lang: true
```

A page's language is `meta.lang`; pages without one belong to the site's
default language (`app.lang` from `config/app.yaml`).

### URLs

The URL segment is the page's `lang`, and it prefixes the **whole**
`tag_overview_path` — so tag pages sit inside the same language tree as the
rest of the site, exactly where `pages/de/…` already puts your German content.
The default language stays where it is today:

| Config | `en` (default) | `de` |
|---|---|---|
| `tag_overview_path: '/tags'` | `/tags/links.html` | `/de/tags/links.html` |
| `tag_overview_path: '/tutorials/tags'` | `/tutorials/tags/links.html` | `/de/tutorials/tags/links.html` |
| `prefix_default_lang: true` | `/en/tags/links.html` | `/de/tags/links.html` |

Use `prefix_default_lang` if every language on your site lives under its own
directory; leave it off if one language is served from the root.

### What templates get

- `meta.tagLinks` on a page points at that page's own language.
- `meta.tagCloud` is the current page's language cloud. It exists **only**
  when `group_by_lang` is on; the shipped `tag-cloud` partial falls back to
  `app.tagCloud`, so both modes render through the same markup.
- `app.tagCloudByLang` is `{ en: [...], de: [...], es: [...] }`. Unlike
  `meta.tagCloud`, it is written in **both** modes — with grouping off it holds
  the single namespace under the default language's key.
- `app.tagCloud` keeps its existing flat-array shape and holds the default
  language, so a template that never learned about languages still works.
- Generated tag pages carry `meta.lang`, and their `meta.taggedPages` lists
  only pages of that language.

```pug
// Language-aware by construction — no change needed in your own markup
each tag in (meta.tagCloud || app.tagCloud)
    a.tag-cloud__item(href=tag.href) #{tag.name}
```

If your site published templates before upgrading, re-run
`npx nera-tags --force` to pick up the updated `tag-cloud` and `tag-overview`
partials.

## 🛠️ Template Publishing

Use the default templates provided by the plugin:

```bash
npx nera-tags
```

This copies template files to your project:

```
views/vendor/plugin-tags/
├── pages/
│   └── tag-overview.pug
└── partials/
    ├── tag-cloud.pug
    └── tag-links.pug
```

### Using the templates

Include the templates in your Pug files:

```pug
// In any layout or page - display tag cloud
include /vendor/plugin-tags/partials/tag-cloud

// Display page-specific tags
include /vendor/plugin-tags/partials/tag-links

// For tag overview pages
include /vendor/plugin-tags/pages/tag-overview
```

Point `tag_overview_layout` at a layout that includes
`pages/tag-overview`, so generated tag pages render through it.

Publishing **skips** a `views/vendor/plugin-tags/` that already exists, so
your edits are never silently overwritten. To pull in updated templates after
upgrading the plugin, re-run with `--force` — this discards local edits, so
re-apply them afterwards:

```bash
npx nera-tags --force
```

## 🔢 Plugin ordering

This is the only plugin that *adds* pages, and plugins run alphabetically
unless `config/plugin-order.yaml` says otherwise. Tag pages are therefore
created after any plugin sorting before `tags` has already run, and those
plugins never see them — a layout reading, say, `meta.canonicalLink.href`
works on your authored pages and fails on every generated tag page.

If your layout depends on metadata another plugin adds, list `tags` early:

```yaml
start:
    - plugin-tags
```

Note the trade-off rather than assuming earlier is always better: running
`tags` first means `meta.taggedPages` captures each page's metadata *before*
later plugins enrich it. Order for whichever of the two your templates
actually read.

## 🎨 Styling

The plugin uses BEM CSS methodology with the following classes:

**Tag Cloud:**
- `.tag-cloud` - Main container
- `.tag-cloud__item` - Individual tag link

**Tag Links:**
- `.tag-links` - Main container
- `.tag-links__item` - Individual tag link

**Tag Overview:**
- `.tag-overview` / `.tag-overview__header` / `.tag-overview__title`
- `.tag-overview__image` - Optional configured tag image
- `.tag-overview__content` - Wrapper around the list of tagged pages
- `.tag-overview__item` and its `__item-title`, `__item-date`,
  `__item-description`, `__item-link` children

You can customize the styling by overriding these classes in your CSS.

**These class names are a public contract.** You style them from your own CSS,
so renaming one here is a breaking change and ships as a **major** version.

## 📊 Generated Output

### URLs

Tag overview pages are automatically generated with clean URLs:

- `/tags/javascript.html` - All JavaScript-related content
- `/tags/css.html` - All CSS-related content
- `/tags/web-development.html` - All web development content

Each tag is reduced to a slug for its URL: diacritics are stripped, case is
folded, and every run of characters that is not a letter or digit becomes a
single hyphen.

| Tag | Slug | URL |
|---|---|---|
| `JavaScript` | `javascript` | `/tags/javascript.html` |
| `web development` | `web-development` | `/tags/web-development.html` |
| `vue.js` | `vue-js` | `/tags/vue-js.html` |
| `Übergrößen` | `ubergrossen` | `/tags/ubergrossen.html` |

Tags that share a slug share a page, which is why `CSS` and `css` do not
produce two half-populated overviews. The name shown in the tag cloud is the
alphabetically first variant found, so results do not depend on the order
pages happen to be read in. A tag with no URL-safe characters at all (`+++`)
is skipped with a warning rather than generating an unreachable page.

### Markup

What the shipped templates emit, for a site with two pages tagged
`javascript, web development` and `css, web development`:

```html
<!-- partials/tag-cloud.pug -->
<section class="tag-cloud"><a class="tag-cloud__item" href="/tags/css.html">css</a><a class="tag-cloud__item" href="/tags/javascript.html">javascript</a><a class="tag-cloud__item" href="/tags/web-development.html">web development</a></section>

<!-- partials/tag-links.pug, on the CSS page -->
<section class="tag-links"><a class="tag-links__item" href="/tags/css.html">css</a><a class="tag-links__item" href="/tags/web-development.html">web development</a></section>
```

```html
<!-- pages/tag-overview.pug, rendered at /tags/web-development.html -->
<section class="tag-overview">
  <header class="tag-overview__header">
    <h1 class="tag-overview__title">web development</h1>
  </header>
  <section class="tag-overview__content">
    <article class="tag-overview__item">
      <h2 class="tag-overview__item-title">CSS Grid Layout Guide</h2><time class="tag-overview__item-date">2/3/2026, 12:00:00 AM</time>
      <p class="tag-overview__item-description">Master CSS Grid for modern web layouts</p><a class="tag-overview__item-link" href="/articles/css-grid.html">Read more</a>
    </article>
    <article class="tag-overview__item">
      <h2 class="tag-overview__item-title">Getting Started with JavaScript</h2><time class="tag-overview__item-date">1/2/2026, 12:00:00 AM</time>
      <p class="tag-overview__item-description">Learn the basics of JavaScript programming</p><a class="tag-overview__item-link" href="/articles/js-basics.html">Read more</a>
    </article>
  </section>
</section>
```

Two things to expect rather than be surprised by: the dates come from
`toLocaleString(meta.lang || app.lang)`, so their exact formatting follows the
build machine's locale and time zone; and `.tag-overview__image` only appears
when a [tag image](#tag-images) is configured.

## 🧪 Development

```bash
npm install
npx vitest run
npm run lint
```

`npm test` starts Vitest in **watch** mode; use `npx vitest run` for a single
pass. Tests use [Vitest](https://vitest.dev) and cover:

- Tag cloud generation, sorting, slugging and case folding
- Tag links creation for pages
- Generated page metadata against the shape the generator writes files from
- Per-language grouping: URLs, scoped clouds, chips and overviews, plus the
  unchanged single-namespace behaviour
- Template rendering, including the shipped templates fed with real plugin output
- Template publishing, with and without `--force`
- That the markup in [Generated Output](#-generated-output) still matches what
  the shipped templates render, so the README cannot quietly go stale

## 🤝 Contributing

Issues and pull requests are welcome. See the
[Nera contributing guide](https://github.com/seebaermichi/nera/blob/main/CONTRIBUTING.md)
for plugin development, the hook contract, and local setup.

For this repo specifically:

- `npx vitest run` and `npm run lint` must pass (`npm test` is watch mode).
- Bump the version and update `CHANGELOG.md` **in the same commit** as the change.
- Template markup and BEM class names are a **public contract** — users style
  them from their own CSS, so changing one is a **major** bump.
- Releases publish from CI on a pushed `v*` tag. Never run `npm publish`.

## 🧑‍💻 Author

Michael Becker  
[https://github.com/seebaermichi](https://github.com/seebaermichi)

## 🔗 Links

- [Plugin Repository](https://github.com/seebaermichi/nera-plugin-tags)
- [NPM Package](https://www.npmjs.com/package/@nera-static/plugin-tags)
- [Nera Static Site Generator](https://github.com/seebaermichi/nera)

## 🧩 Compatibility

- **Nera**: v4.3.0+ for the root-absolute `include /vendor/plugin-tags/…` shown
  in [Template Publishing](#️-template-publishing), which needs the Pug
  `basedir` the generator began setting in 4.3.0; the
  [Plugin ordering](#-plugin-ordering) advice needs v4.2.0+. The plugin itself
  needs nothing above the 4.x baseline — on v4.1.x–v4.2.x use the relative form
  `include ../vendor/plugin-tags/partials/tag-cloud` from a layout in
  `views/layouts/`.
- **Node.js**: >= 20.0.0
- **Plugin API**: Uses `getAppData()` and `getMetaData()` for tag processing
- **`@nera-static/plugin-utils`**: ^1.4.0 — `getConfig()` and `slugify()`

## 📦 License

MIT
