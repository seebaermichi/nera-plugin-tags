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
        tagSeparator: config.tag_separator || ','
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
 * Collects every distinct tag across all pages, keyed by slug.
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

export function getAppData(data) {
    const { config, metaPropertyName, tagOverviewPath, tagSeparator } =
        loadConfig()

    return {
        ...data.app,
        // Forwarded so the shipped tag-overview template can reach the
        // documented `tag_overview_*_image` keys. Without this the template
        // reads a property of undefined and takes the whole build down.
        tagsConfig: config,
        tagCloud: getTagCloud(
            data.pagesData,
            metaPropertyName,
            tagSeparator,
            tagOverviewPath
        )
    }
}

export function getMetaData(data) {
    const {
        metaPropertyName,
        tagOverviewPath,
        tagOverviewLayout,
        tagOverviewMeta,
        tagSeparator
    } = loadConfig()

    const authoredPages = data.pagesData
    const tagCloud = getTagCloud(
        authoredPages,
        metaPropertyName,
        tagSeparator,
        tagOverviewPath
    )

    // `filename` and `dirname` are what render.js joins into the output path;
    // omitting `filename` wrote every tag page to `public/tags/undefined`.
    // Deriving all four keys from one href keeps them from drifting apart,
    // the same way core.js#getPagesData does it for authored pages.
    const tagPages = tagCloud.map(tag => {
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
                taggedPages: getTaggedPages(
                    authoredPages,
                    metaPropertyName,
                    tagSeparator,
                    tag.slug
                )
            }
        }
    })

    // A new array rather than `data.pagesData.push(...)`: mutating the input
    // meant a second call appended a second set of tag pages, and it left
    // generated pages visible to `getTaggedPages` mid-loop.
    return [...authoredPages, ...tagPages].map(({ content, meta }) => ({
        content,
        meta: {
            ...meta,
            tagLinks: getTagLinks(
                meta[metaPropertyName],
                tagSeparator,
                tagOverviewPath
            )
        }
    }))
}
