import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getAppData, getMetaData, slugifyTag } from '../index.js'

// The plugin reads `config/tags.yaml` from the *host project*, i.e. from
// `process.cwd()`. Every test therefore runs in a throwaway directory: it is
// the only way to exercise a custom config, and it keeps the suite from
// writing into this repo's own `config/`.
const originalCwd = process.cwd()
let projectDir

beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nera-tags-'))
    process.chdir(projectDir)
})

afterEach(() => {
    process.chdir(originalCwd)
    fs.rmSync(projectDir, { recursive: true, force: true })
})

function writeConfig(yaml) {
    fs.mkdirSync(path.join(projectDir, 'config'), { recursive: true })
    fs.writeFileSync(path.join(projectDir, 'config/tags.yaml'), yaml, 'utf-8')
}

function page(meta) {
    return { content: `<h1>${meta.title}</h1>`, meta }
}

describe('slugifyTag', () => {
    it.each([
        ['javascript', 'javascript'],
        ['JavaScript', 'javascript'],
        ['CSS', 'css'],
        ['web development', 'web-development'],
        ['  spaced  out  ', 'spaced-out'],
        ['vue.js', 'vue-js'],
        ['C++', 'c'],
        ['Übergrößen', 'ubergrossen'],
        ['Café', 'cafe'],
        ['---', ''],
    ])('slugifies %o to %o', (input, expected) => {
        expect(slugifyTag(input)).toBe(expected)
    })
})

describe('getAppData', () => {
    it('creates a tag cloud from page tags', () => {
        const result = getAppData({
            app: { title: 'Test App' },
            pagesData: [
                page({ title: 'Article 1', tags: 'javascript, web development, programming' }),
                page({ title: 'Article 2', tags: 'javascript, frontend' }),
                page({ title: 'Article 3', tags: 'web development, css' }),
            ],
        })

        expect(result.tagCloud.map(tag => tag.name)).toEqual([
            'css',
            'frontend',
            'javascript',
            'programming',
            'web development',
        ])
        expect(result.tagCloud[0]).toEqual({
            name: 'css',
            slug: 'css',
            href: '/tags/css.html',
        })
    })

    it('hyphenates spaces in generated hrefs, as the README promises', () => {
        const result = getAppData({
            app: {},
            pagesData: [page({ title: 'Article', tags: 'web development' })],
        })

        expect(result.tagCloud[0].href).toBe('/tags/web-development.html')
    })

    it('folds tags that differ only in case into a single entry', () => {
        const result = getAppData({
            app: {},
            pagesData: [
                page({ title: 'Article 1', tags: 'CSS' }),
                page({ title: 'Article 2', tags: 'css' }),
                page({ title: 'Article 3', tags: 'Css' }),
            ],
        })

        expect(result.tagCloud).toHaveLength(1)
        expect(result.tagCloud[0].href).toBe('/tags/css.html')
    })

    it('picks the same display name regardless of page order', () => {
        const variants = [
            page({ title: 'A', tags: 'CSS' }),
            page({ title: 'B', tags: 'css' }),
        ]

        const forwards = getAppData({ app: {}, pagesData: variants })
        const backwards = getAppData({ app: {}, pagesData: [...variants].reverse() })

        expect(forwards.tagCloud[0].name).toBe(backwards.tagCloud[0].name)
    })

    it('accepts a YAML list as well as a separated string', () => {
        const result = getAppData({
            app: {},
            pagesData: [page({ title: 'Article', tags: ['css', 'js'] })],
        })

        expect(result.tagCloud.map(tag => tag.name)).toEqual(['css', 'js'])
    })

    it('does not throw on a non-string scalar tag', () => {
        const result = getAppData({
            app: {},
            pagesData: [page({ title: 'Article', tags: 2024 })],
        })

        expect(result.tagCloud.map(tag => tag.name)).toEqual(['2024'])
    })

    it('handles pages without tags gracefully', () => {
        const result = getAppData({
            app: {},
            pagesData: [page({ title: 'No Tags Article' })],
        })

        expect(result.tagCloud).toHaveLength(0)
    })

    it('removes duplicate tags', () => {
        const result = getAppData({
            app: {},
            pagesData: [
                page({ title: 'Article 1', tags: 'javascript, react' }),
                page({ title: 'Article 2', tags: 'javascript, vue' }),
            ],
        })

        expect(result.tagCloud.map(tag => tag.name)).toEqual([
            'javascript',
            'react',
            'vue',
        ])
    })

    it('forwards the config as app.tagsConfig', () => {
        writeConfig('tag_overview_default_image: /img/tag.jpg\n')

        const result = getAppData({ app: {}, pagesData: [] })

        expect(result.tagsConfig.tag_overview_default_image).toBe('/img/tag.jpg')
    })

    it('provides an empty tagsConfig when the project has no config file', () => {
        const result = getAppData({ app: {}, pagesData: [] })

        expect(result.tagsConfig).toEqual({})
    })

    it('preserves existing app properties', () => {
        const result = getAppData({
            app: { title: 'Test App', lang: 'en' },
            pagesData: [],
        })

        expect(result.title).toBe('Test App')
        expect(result.lang).toBe('en')
    })
})

describe('getMetaData', () => {
    it('adds tag links to pages with tags', () => {
        const result = getMetaData({
            app: {},
            pagesData: [
                page({ title: 'Article 1', tags: 'javascript, react' }),
                page({ title: 'Article 2', tags: 'css, design' }),
                page({ title: 'No Tags' }),
            ],
        })

        expect(result[0].meta.tagLinks).toEqual([
            { name: 'javascript', slug: 'javascript', href: '/tags/javascript.html' },
            { name: 'react', slug: 'react', href: '/tags/react.html' },
        ])
        expect(result[1].meta.tagLinks).toEqual([
            { name: 'css', slug: 'css', href: '/tags/css.html' },
            { name: 'design', slug: 'design', href: '/tags/design.html' },
        ])
        expect(result[2].meta.tagLinks).toEqual([])
    })

    it('links a differently-cased tag to the shared page while keeping its own spelling', () => {
        const result = getMetaData({
            app: {},
            pagesData: [page({ title: 'Article', tags: 'CSS' })],
        })

        expect(result[0].meta.tagLinks).toEqual([
            { name: 'CSS', slug: 'css', href: '/tags/css.html' },
        ])
    })

    it('creates tag overview pages', () => {
        const result = getMetaData({
            app: {},
            pagesData: [
                page({ title: 'Article 1', tags: 'javascript, react', createdAt: new Date('2023-01-01') }),
                page({ title: 'Article 2', tags: 'javascript, vue', createdAt: new Date('2023-01-02') }),
            ],
        })

        const jsTagPage = result.find(p => p.meta.tag === 'javascript')

        expect(jsTagPage.meta.title).toBe('javascript')
        expect(jsTagPage.meta.href).toBe('/tags/javascript.html')
        expect(jsTagPage.meta.htmlPathName).toBe('/tags/javascript.html')
        expect(jsTagPage.meta.taggedPages).toHaveLength(2)

        // Newest first
        expect(jsTagPage.meta.taggedPages[0].meta.title).toBe('Article 2')
        expect(jsTagPage.meta.taggedPages[1].meta.title).toBe('Article 1')
    })

    // The 2.x bug: `filename` was never set, so render.js joined the output
    // path with the literal string "undefined" and every tag page in a site
    // overwrote the same file.
    it('gives every generated page the filename and dirname render.js needs', () => {
        const result = getMetaData({
            app: {},
            pagesData: [
                page({ title: 'Article 1', tags: 'javascript' }),
                page({ title: 'Article 2', tags: 'web development' }),
            ],
        })

        const generated = result.filter(p => p.meta.tag)
        expect(generated).toHaveLength(2)

        const outputPaths = generated.map(p =>
            path.posix.join(p.meta.dirname.replace(/^\/+/, ''), p.meta.filename)
        )

        expect(outputPaths).toEqual([
            'tags/javascript.html',
            'tags/web-development.html',
        ])
        expect(outputPaths.every(p => !p.includes('undefined'))).toBe(true)
        expect(new Set(outputPaths).size).toBe(outputPaths.length)
    })

    // Guards against the two halves drifting apart again: the path a page is
    // written to must be the path every tag link points at.
    it('writes each page to exactly the path its tag links point at', () => {
        const result = getMetaData({
            app: {},
            pagesData: [page({ title: 'Article', tags: 'JavaScript, web development' })],
        })

        const writtenPaths = result
            .filter(p => p.meta.tag)
            .map(p => path.posix.join(p.meta.dirname, p.meta.filename))

        expect(writtenPaths.sort()).toEqual(
            result[0].meta.tagLinks.map(l => l.href).sort()
        )
    })

    it('matches the meta shape the generator derives for authored pages', () => {
        const result = getMetaData({
            app: {},
            pagesData: [page({ title: 'Article', tags: 'javascript' })],
        })

        const generated = result.find(p => p.meta.tag)

        // core.js#getPagesData derives all four from one path string
        expect(generated.meta.fullPath).toBe(generated.meta.href)
        expect(generated.meta.dirname).toBe(path.posix.dirname(generated.meta.href))
        expect(generated.meta.filename).toBe(path.posix.basename(generated.meta.href))
        expect(generated.meta.createdAt).toBeInstanceOf(Date)
        expect(generated.meta.layout).toBeTruthy()
    })

    it('merges case variants into one overview page holding every tagged page', () => {
        const result = getMetaData({
            app: {},
            pagesData: [
                page({ title: 'Upper', tags: 'CSS' }),
                page({ title: 'Lower', tags: 'css' }),
            ],
        })

        const tagPages = result.filter(p => p.meta.tag)

        expect(tagPages).toHaveLength(1)
        expect(tagPages[0].meta.taggedPages.map(p => p.meta.title).sort()).toEqual([
            'Lower',
            'Upper',
        ])
    })

    it('does not mutate the pagesData it was given', () => {
        const pagesData = [page({ title: 'Article', tags: 'javascript' })]

        getMetaData({ app: {}, pagesData })
        getMetaData({ app: {}, pagesData })

        expect(pagesData).toHaveLength(1)
    })

    it('keeps generated pages out of taggedPages', () => {
        const result = getMetaData({
            app: {},
            pagesData: [page({ title: 'Article', tags: 'javascript' })],
        })

        const generated = result.find(p => p.meta.tag)

        expect(generated.meta.taggedPages.every(p => !p.meta.tag)).toBe(true)
    })

    it('honours a custom tag separator', () => {
        writeConfig('tag_separator: \'|\'\n')

        const result = getMetaData({
            app: {},
            pagesData: [page({ title: 'Article', tags: 'tag1|tag2|tag3' })],
        })

        expect(result[0].meta.tagLinks.map(l => l.name)).toEqual([
            'tag1',
            'tag2',
            'tag3',
        ])
    })

    it('honours a custom meta property name', () => {
        writeConfig('meta_property_name: topics\n')

        const result = getMetaData({
            app: {},
            pagesData: [page({ title: 'Article', topics: 'alpha, beta' })],
        })

        expect(result[0].meta.tagLinks.map(l => l.name)).toEqual(['alpha', 'beta'])
    })

    it('honours a custom overview path, with or without slashes', () => {
        writeConfig('tag_overview_path: \'topics/\'\n')

        const result = getMetaData({
            app: {},
            pagesData: [page({ title: 'Article', tags: 'javascript' })],
        })

        const generated = result.find(p => p.meta.tag)

        expect(generated.meta.href).toBe('/topics/javascript.html')
        expect(generated.meta.dirname).toBe('/topics')
        expect(generated.meta.filename).toBe('javascript.html')
    })

    // README.md documents `tag_overview_meta.layout` as supported; 2.x spread
    // the block first and then overwrote `layout` with `tag_overview_layout`.
    it('lets tag_overview_meta.layout win over tag_overview_layout', () => {
        writeConfig(
            'tag_overview_layout: pages/default.pug\n' +
                'tag_overview_meta:\n' +
                '  layout: pages/tag-layout.pug\n' +
                '  description: Browse content by tag\n'
        )

        const generated = getMetaData({
            app: {},
            pagesData: [page({ title: 'Article', tags: 'javascript' })],
        }).find(p => p.meta.tag)

        expect(generated.meta.layout).toBe('pages/tag-layout.pug')
        expect(generated.meta.description).toBe('Browse content by tag')
    })

    it('falls back to tag_overview_layout when tag_overview_meta sets no layout', () => {
        writeConfig(
            'tag_overview_layout: pages/tags.pug\n' +
                'tag_overview_meta:\n' +
                '  description: Browse content by tag\n'
        )

        const generated = getMetaData({
            app: {},
            pagesData: [page({ title: 'Article', tags: 'javascript' })],
        }).find(p => p.meta.tag)

        expect(generated.meta.layout).toBe('pages/tags.pug')
    })

    it('trims whitespace from tags', () => {
        const result = getMetaData({
            app: {},
            pagesData: [page({ title: 'Article', tags: '  javascript  ,   react   , vue.js   ' })],
        })

        expect(result[0].meta.tagLinks).toEqual([
            { name: 'javascript', slug: 'javascript', href: '/tags/javascript.html' },
            { name: 'react', slug: 'react', href: '/tags/react.html' },
            { name: 'vue.js', slug: 'vue-js', href: '/tags/vue-js.html' },
        ])
    })

    it('drops a tag with no URL-safe characters instead of emitting a broken href', () => {
        const result = getMetaData({
            app: {},
            pagesData: [page({ title: 'Article', tags: 'javascript, +++' })],
        })

        expect(result[0].meta.tagLinks.map(l => l.name)).toEqual(['javascript'])
        expect(result.filter(p => p.meta.tag)).toHaveLength(1)
    })

    it('preserves existing meta properties', () => {
        const result = getMetaData({
            app: {},
            pagesData: [
                page({
                    title: 'Article',
                    author: 'John Doe',
                    tags: 'javascript',
                    customField: 'value',
                }),
            ],
        })

        expect(result[0].meta.title).toBe('Article')
        expect(result[0].meta.author).toBe('John Doe')
        expect(result[0].meta.customField).toBe('value')
        expect(result[0].meta.tagLinks).toBeDefined()
    })
})
