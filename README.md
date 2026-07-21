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
- Full compatibility with Nera v4.1.0+

## 🚀 Installation

Install the plugin in your Nera project:

```bash
npm install @nera-static/plugin-tags
```

Nera will automatically detect the plugin and apply tag processing during the build.

## ⚙️ Configuration

The plugin uses `config/tags.yaml` to configure tag behavior:

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

These keys are exposed to templates as `app.tagsConfig`. The lookup uses the
tag's slug (see [Generated URLs](#-generated-urls)), so a multi-word tag such
as `web development` is configured as `tag_overview_web-development_image`.
A language-qualified key — `tag_overview_de_web-development_image`, or
`tag_overview_de_default_image` — wins over the plain one on that language's
pages, which is only useful together with
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
tags:
    - css
    - web development
---
```

```yaml
---
title: CSS Grid Layout Guide
description: Master CSS Grid for modern web layouts
tags: css, layout, web development, design
---

# CSS Grid Layout Guide

More content...
```

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
```javascript
[
    {
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
- `app.tagCloudByLang` is `{ en: [...], de: [...], es: [...] }`.
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

## 📊 Generated URLs

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

## 🧪 Development

```bash
npm install
npm test
npm run lint
```

Tests use [Vitest](https://vitest.dev) and cover:

- Tag cloud generation, sorting, slugging and case folding
- Tag links creation for pages
- Generated page metadata against the shape the generator writes files from
- Per-language grouping: URLs, scoped clouds, chips and overviews, plus the
  unchanged single-namespace behaviour
- Template rendering, including the shipped templates fed with real plugin output
- Template publishing, with and without `--force`

## 🧑‍💻 Author

Michael Becker
[https://github.com/seebaermichi](https://github.com/seebaermichi)

## 🔗 Links

- [Plugin Repository](https://github.com/seebaermichi/nera-plugin-tags)
- [NPM Package](https://www.npmjs.com/package/@nera-static/plugin-tags)
- [Nera Static Site Generator](https://github.com/seebaermichi/nera)

## 🧩 Compatibility

- **Nera**: v4.1.0+
- **Node.js**: >= 18
- **Plugin API**: Uses `getAppData()` and `getMetaData()` for tag processing
- **`@nera-static/plugin-utils`**: ^1.2.0

## 📦 License

MIT
