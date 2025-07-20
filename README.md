# @nera-static/plugin-tags

A plugin for the [Nera](https://github.com/seebaermichi/nera) static site generator that creates tag clouds, tag links, and tag overview pages from page tags. Perfect for content organization, taxonomy management, and content discovery.

## ✨ Features

- Filter and organize content by tags
- Automatic tag cloud generation with alphabetical sorting
- Clickable tag links for each page
- Individual tag overview pages with all tagged content
- Access all tag data globally via `app.tagCloud` and `meta.tagLinks`
- Includes ready-to-use Pug templates with BEM CSS methodology
- Template publishing system for easy customization
- Configurable tag separators, paths, and layouts
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

# Layout template for tag overview pages (default: 'pages/default.pug')
tag_overview_layout: 'pages/default.pug'

# Additional meta properties for tag overview pages
tag_overview_meta:
  description: 'Browse content by tag'
  layout: 'pages/tag-layout.pug'

# Optional: Tag-specific images
tag_overview_default_image: '/images/tags/default.jpg'
tag_overview_javascript_image: '/images/tags/js-logo.jpg'
tag_overview_css_image: '/images/tags/css-logo.jpg'
```

- **`meta_property_name`**: The meta field containing tags (defaults to `tags`)
- **`tag_separator`**: Character used to separate tags (defaults to `,`)
- **`tag_overview_path`**: Base URL path for tag pages (defaults to `/tags`)
- **`tag_overview_layout`**: Layout template for tag overview pages
- **`tag_overview_meta`**: Additional meta properties for tag pages
- **`tag_overview_*_image`**: Tag-specific or default images

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
        href: "/tags/javascript.html"
    },
    {
        name: "css",
        href: "/tags/css.html"
    }
]
```

**Page tag links (`meta.tagLinks`)**:
```javascript
[
    {
        name: "javascript",
        href: "/tags/javascript.html"
    },
    {
        name: "programming",
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

## 🛠️ Template Publishing

Use the default templates provided by the plugin:

```bash
npx @nera-static/plugin-tags run publish-template
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

## 🎨 Styling with BEM CSS

The templates use BEM (Block Element Modifier) methodology for CSS classes.

## 📊 Generated URLs

Tag overview pages are automatically generated with clean URLs:

- `/tags/javascript.html` - All JavaScript-related content
- `/tags/css.html` - All CSS-related content
- `/tags/web-development.html` - All web development content

Tags with spaces or special characters are URL-safe (converted to lowercase, spaces become hyphens).

## 🧪 Development

```bash
npm install
npm test
npm run lint
```

### Testing

The plugin includes comprehensive tests covering:

- **Unit tests** for tag cloud generation, tag links, and page generation
- **Integration tests** for template publishing functionality
- **Template rendering tests** for all included Pug templates with BEM classes

Tests validate tag extraction, deduplication, sorting, URL generation, and template rendering with various data scenarios.

## 🔧 Advanced Configuration

### Custom Tag Separators

```yaml
# Use pipe separator instead of comma
tag_separator: '|'
```

```yaml
---
title: My Article
tags: javascript|react|frontend
---
```

### Custom Meta Property

```yaml
# Use 'categories' instead of 'tags'
meta_property_name: categories
```

```yaml
---
title: My Article
categories: javascript, react, frontend
---
```

### Custom Paths and Layouts

```yaml
# Custom tag overview configuration
tag_overview_path: '/topics'
tag_overview_layout: 'layouts/topic-page.pug'
tag_overview_meta:
  layout: 'layouts/topic-page.pug'
  description: 'Browse articles by topic'
  image: '/images/topics-banner.jpg'
```

## 🧑‍💻 Author

Michael Becker
[https://github.com/seebaermichi](https://github.com/seebaermichi)

## 🔗 Links

-   [Plugin Repository](https://github.com/seebaermichi/nera-plugin-tags)
-   [NPM Package](https://www.npmjs.com/package/@nera-static/plugin-tags)
-   [Nera Static Site Generator](https://github.com/seebaermichi/nera)

## 📄 License

MIT
