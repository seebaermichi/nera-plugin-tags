import path from 'path'
import { getConfig } from '@nera-static/plugin-utils'

const HOST_CONFIG_PATH = path.resolve(
    process.cwd(),
    'config/tags.yaml'
)

function getTagHref(tagOverviewPath, tag) {
    return `${tagOverviewPath}/${tag.toLowerCase()}.html`
}

function getTagLinks(tags, tagSeparator, tagOverviewPath) {
    if (!tags) return []

    return tags.split(tagSeparator).map(tag => ({
        name: tag.trim(),
        href: getTagHref(tagOverviewPath, tag.trim())
    }))
}

function getTagCloud(pagesData, metaPropertyName, tagSeparator, tagOverviewPath) {
    const tagCloud = []

    pagesData.filter(({ meta }) => meta[metaPropertyName])
        .forEach(({ meta }) => {
            meta[metaPropertyName].split(tagSeparator)
                .map(tag => tag.trim())
                .forEach(tag => {
                    if (!tagCloud.some(t => t.name === tag)) {
                        tagCloud.push({
                            name: tag,
                            href: getTagHref(tagOverviewPath, tag)
                        })
                    }
                })
        })

    return tagCloud.sort((a, b) => a.name.localeCompare(b.name))
}

function getTaggedPages(pagesData, metaPropertyName, tagSeparator, tag) {
    return pagesData.filter(({ meta }) => {
        if (!meta[metaPropertyName]) return false
        const tags = meta[metaPropertyName].split(tagSeparator).map(t => t.trim())
        return tags.includes(tag)
    }).sort((a, b) => new Date(b.meta.createdAt) - new Date(a.meta.createdAt))
}

export function getAppData(data) {
    const config = getConfig(HOST_CONFIG_PATH)

    const metaPropertyName = config.meta_property_name || 'tags'
    const tagOverviewPath = config.tag_overview_path || '/tags'
    const tagSeparator = config.tag_separator || ','

    return {
        ...data.app,
        tagCloud: getTagCloud(data.pagesData, metaPropertyName, tagSeparator, tagOverviewPath)
    }
}

export function getMetaData(data) {
    const config = getConfig(HOST_CONFIG_PATH)

    const metaPropertyName = config.meta_property_name || 'tags'
    const tagOverviewPath = config.tag_overview_path || '/tags'
    const tagOverviewLayout = config.tag_overview_layout || 'pages/default.pug'
    const tagOverviewMeta = config.tag_overview_meta || {}
    const tagSeparator = config.tag_separator || ','

    // Generate tag overview pages
    const tagCloud = getTagCloud(data.pagesData, metaPropertyName, tagSeparator, tagOverviewPath)

    tagCloud.forEach(tag => {
        data.pagesData.push({
            content: '',
            meta: {
                ...tagOverviewMeta,
                layout: tagOverviewLayout,
                title: tag.name,
                createdAt: new Date(),
                htmlPathName: getTagHref(tagOverviewPath, tag.name),
                href: getTagHref(tagOverviewPath, tag.name),
                pagePathName: tagOverviewPath.replace('/', ''),
                dirname: tagOverviewPath.replace('/', ''),
                tag: tag.name,
                taggedPages: getTaggedPages(data.pagesData, metaPropertyName, tagSeparator, tag.name)
            }
        })
    })

    // Add tag links to all pages
    return data.pagesData.map(({ content, meta }) => ({
        content,
        meta: {
            ...meta,
            tagLinks: getTagLinks(meta[metaPropertyName], tagSeparator, tagOverviewPath)
        }
    }))
}
