import path from 'path'
import { getConfig } from '@nera-static/plugin-utils'

// Resolved per call rather than at module scope: `process.cwd()` is captured
// at import time otherwise, which is both untestable and wrong for any host
// that changes directory between import and render.
function loadConfig() {
    const config = getConfig(path.resolve(process.cwd(), 'config/tags.yaml'))

    return {
        config,
        metaPropertyName: config.meta_property_name || 'tags',
        tagOverviewPath: normalizeOverviewPath(config.tag_overview_path),
        tagOverviewLayout: config.tag_overview_layout || 'pages/default.pug',
        tagOverviewMeta: config.tag_overview_meta || {},
        tagSeparator: config.tag_separator || ',',
        // Opt-in: off means one global tag namespace, exactly as before.
        groupByLang: config.group_by_lang === true,
        prefixDefaultLang: config.prefix_default_lang === true
    }
}

// Guarantees exactly one leading slash and no trailing one, so the href
// built from it can never contain `//` or lose its root.
function normalizeOverviewPath(configured) {
    const raw = typeof configured === 'string' ? configured.trim() : ''
    const trimmed = raw.replace(/^\/+/, '').replace(/\/+$/, '')

    return `/${trimmed || 'tags'}`
}

/**
 * The language a page belongs to.
 *
 * Pages without `meta.lang` fall into the site's default language rather than
 * a group of their own, so a single-language site — where nothing sets
 * `lang` at all — keeps producing exactly one namespace.
 */
function getPageLang(meta, defaultLang) {
    const lang = typeof meta.lang === 'string' ? meta.lang.trim() : ''

    return lang || defaultLang
}

/**
 * Builds the overview base path for one language.
 *
 * The language segment prefixes the *whole* configured `tag_overview_path`,
 * so a site that serves its German pages under `/de/…` gets its tag pages at
 * `/de/<tag_overview_path>/…` and they compose with the site's own URL layout
 * (and with navigation's active-path matching, which keys off the section the
 * page sits in).
 *
 * The segment is the language code itself — the same one the site already
 * uses for its own directories, since a language served from a directory is
 * the only layout this can compose with. The default language is unprefixed
 * unless `prefix_default_lang` is set, matching sites that serve one language
 * from the root.
 */
function getOverviewPathForLang(lang, options) {
    const { tagOverviewPath, groupByLang, prefixDefaultLang, defaultLang } =
        options

    if (!groupByLang) return tagOverviewPath
    if (lang === defaultLang && !prefixDefaultLang) return tagOverviewPath

    const segment = lang.replace(/^\/+/, '').replace(/\/+$/, '')

    return segment ? `/${segment}${tagOverviewPath}` : tagOverviewPath
}

/**
 * Folds a tag into the token used for its URL.
 *
 * Diacritics are stripped, case is folded, and every run of characters that
 * is not a letter or digit becomes a single hyphen. Two tags that differ only
 * in case or punctuation therefore share one page — which is the point: `CSS`
 * and `css` are the same tag to a human.
 *
 * @param {string} tag - Trimmed tag as authored
 * @returns {string} - URL-safe slug, or '' if nothing usable remains
 */
export function slugifyTag(tag) {
    return String(tag)
        // ß has no NFKD decomposition, so it would otherwise become a hyphen
        // mid-word. Its expansion is the same in every language that uses it.
        .replace(/ß/g, 'ss')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/**
 * Normalizes whatever the frontmatter yielded into a list of trimmed tags.
 *
 * `tags: css, js` and `tags: [css, js]` are both natural authoring forms and
 * YAML types them differently, so accepting only the String form turned the
 * list form into a `tags.split is not a function` build failure.
 *
 * @param {*} value - Raw frontmatter value
 * @param {string} separator - Configured separator for the string form
 * @returns {string[]} - Trimmed, non-empty tags
 */
function normalizeTags(value, separator) {
    if (value === null || value === undefined || value === '') return []

    const entries = Array.isArray(value) ? value : [value]

    return entries
        .filter(entry => entry !== null && entry !== undefined)
        .flatMap(entry => {
            if (typeof entry === 'object' && !(entry instanceof Date)) {
                console.warn(
                    '⚠️ plugin-tags: ignoring a tag that is not a scalar value.'
                )
                return []
            }

            return String(entry).split(separator)
        })
        .map(tag => tag.trim())
        .filter(Boolean)
}

/**
 * Groups pages by the language whose tags they contribute to.
 *
 * With grouping off every page lands under the default language, so the
 * single-namespace behaviour is this same code with one group.
 *
 * @returns {Map<string, Array>} - language → its pages, alphabetical by
 *   language so output does not depend on the order pages were read in
 */
function getPagesByLang(pagesData, options) {
    const byLang = new Map()

    pagesData.forEach(page => {
        const lang = options.groupByLang
            ? getPageLang(page.meta, options.defaultLang)
            : options.defaultLang

        if (!byLang.has(lang)) byLang.set(lang, [])

        byLang.get(lang).push(page)
    })

    return new Map([...byLang.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

/**
 * Collects every distinct tag across the given pages, keyed by slug.
 *
 * Tags sharing a slug are one entry. The display name is the alphabetically
 * first of the variants rather than the first encountered, so the output does
 * not depend on the order the filesystem happened to hand pages over in.
 */
function getTagCloud(pagesData, metaPropertyName, tagSeparator, tagOverviewPath) {
    const bySlug = new Map()

    pagesData.forEach(({ meta }) => {
        normalizeTags(meta[metaPropertyName], tagSeparator).forEach(tag => {
            const slug = slugifyTag(tag)

            if (!slug) {
                console.warn(
                    `⚠️ plugin-tags: tag "${tag}" has no URL-safe characters and was skipped.`
                )
                return
            }

            const existing = bySlug.get(slug)

            if (!existing || tag.localeCompare(existing) < 0) {
                bySlug.set(slug, tag)
            }
        })
    })

    return [...bySlug.entries()]
        .map(([slug, name]) => ({
            name,
            slug,
            href: `${tagOverviewPath}/${slug}.html`
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * One tag cloud per language, each already carrying that language's hrefs.
 *
 * @returns {Map<string, Array>} - language → cloud
 */
function getTagCloudsByLang(pagesByLang, options) {
    const { metaPropertyName, tagSeparator } = options

    return new Map(
        [...pagesByLang.entries()].map(([lang, pages]) => [
            lang,
            getTagCloud(
                pages,
                metaPropertyName,
                tagSeparator,
                getOverviewPathForLang(lang, options)
            )
        ])
    )
}

function getTaggedPages(pagesData, metaPropertyName, tagSeparator, slug) {
    return pagesData
        .filter(({ meta }) =>
            normalizeTags(meta[metaPropertyName], tagSeparator)
                .map(slugifyTag)
                .includes(slug)
        )
        .sort((a, b) => new Date(b.meta.createdAt) - new Date(a.meta.createdAt))
}

function getTagLinks(tags, tagSeparator, tagOverviewPath) {
    return normalizeTags(tags, tagSeparator)
        .map(tag => ({ tag, slug: slugifyTag(tag) }))
        .filter(({ slug }) => slug)
        .map(({ tag, slug }) => ({
            name: tag,
            slug,
            href: `${tagOverviewPath}/${slug}.html`
        }))
}

// The language every page without an explicit `meta.lang` belongs to, and the
// one whose tag pages stay at the unprefixed path.
function getDefaultLang(app) {
    const lang = typeof app?.lang === 'string' ? app.lang.trim() : ''

    return lang || 'en'
}

export function getAppData(data) {
    const options = {
        ...loadConfig(),
        defaultLang: getDefaultLang(data.app)
    }
    const { config, defaultLang } = options

    const cloudsByLang = getTagCloudsByLang(
        getPagesByLang(data.pagesData, options),
        options
    )

    return {
        ...data.app,
        // Forwarded so the shipped tag-overview template can reach the
        // documented `tag_overview_*_image` keys. Without this the template
        // reads a property of undefined and takes the whole build down.
        tagsConfig: config,
        // Stays the flat array it has always been. With grouping off it holds
        // every tag on the site; with grouping on it holds the default
        // language's, so a template that never learned about languages keeps
        // rendering something coherent instead of breaking.
        tagCloud: cloudsByLang.get(defaultLang) || [],
        tagCloudByLang: Object.fromEntries(cloudsByLang)
    }
}

export function getMetaData(data) {
    const options = {
        ...loadConfig(),
        defaultLang: getDefaultLang(data.app)
    }
    const {
        metaPropertyName,
        tagOverviewLayout,
        tagOverviewMeta,
        tagSeparator,
        groupByLang,
        defaultLang
    } = options

    const authoredPages = data.pagesData
    const pagesByLang = getPagesByLang(authoredPages, options)
    const cloudsByLang = getTagCloudsByLang(pagesByLang, options)

    // `filename` and `dirname` are what render.js joins into the output path;
    // omitting `filename` wrote every tag page to `public/tags/undefined`.
    // Deriving all four keys from one href keeps them from drifting apart,
    // the same way core.js#getPagesData does it for authored pages.
    const tagPages = [...cloudsByLang.entries()].flatMap(([lang, tagCloud]) =>
        tagCloud.map(tag => {
            const href = tag.href

            return {
                content: '',
                meta: {
                    ...tagOverviewMeta,
                    layout: tagOverviewMeta.layout || tagOverviewLayout,
                    title: tag.name,
                    createdAt: new Date(),
                    href,
                    fullPath: href,
                    htmlPathName: href,
                    dirname: path.posix.dirname(href),
                    filename: path.posix.basename(href),
                    pagePathName: path.posix.dirname(href).replace(/^\/+/, ''),
                    tag: tag.name,
                    tagSlug: tag.slug,
                    // Set after the spread: a generated page must render in
                    // the language it was generated for, whatever
                    // `tag_overview_meta` says.
                    ...(groupByLang ? { lang } : {}),
                    // Scoped to this language, so the overview lists only
                    // pages a reader of that language can read.
                    taggedPages: getTaggedPages(
                        pagesByLang.get(lang) || [],
                        metaPropertyName,
                        tagSeparator,
                        tag.slug
                    )
                }
            }
        })
    )

    // A new array rather than `data.pagesData.push(...)`: mutating the input
    // meant a second call appended a second set of tag pages, and it left
    // generated pages visible to `getTaggedPages` mid-loop.
    return [...authoredPages, ...tagPages].map(({ content, meta }) => {
        const lang = groupByLang ? getPageLang(meta, defaultLang) : defaultLang

        return {
            content,
            meta: {
                ...meta,
                // Only when grouping: with one namespace this would be a
                // per-page copy of `app.tagCloud` for no gain, and the shipped
                // partial falls back to `app.tagCloud` when it is absent.
                ...(groupByLang
                    ? { tagCloud: cloudsByLang.get(lang) || [] }
                    : {}),
                tagLinks: getTagLinks(
                    meta[metaPropertyName],
                    tagSeparator,
                    getOverviewPathForLang(lang, options)
                )
            }
        }
    })
}
