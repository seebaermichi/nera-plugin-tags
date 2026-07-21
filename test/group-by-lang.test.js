import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { load } from 'cheerio'
import pug from 'pug'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getAppData, getMetaData } from '../index.js'

// Grouping only earns its keep end to end: the paths, the links, the cloud and
// the shipped partials all have to agree, and a unit test of any one of them
// would miss a disagreement between two.
const viewsDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../views'
)

const originalCwd = process.cwd()
let projectDir

beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nera-tags-lang-'))
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

// A trilingual site of the shape this feature was filed for: the same topic
// tagged in three languages, plus a tag that exists in only one of them.
const pagesData = [
    {
        content: '<h1>Links</h1>',
        meta: {
            title: 'Links',
            lang: 'en',
            tags: 'links, html',
            href: '/tutorials/links.html',
            createdAt: new Date('2023-01-15'),
        },
    },
    {
        content: '<h1>Links</h1>',
        meta: {
            title: 'Verweise',
            lang: 'de',
            tags: 'links, barrierefreiheit',
            href: '/de/tutorials/links.html',
            createdAt: new Date('2023-02-15'),
        },
    },
    {
        content: '<h1>Enlaces</h1>',
        meta: {
            title: 'Enlaces',
            lang: 'es',
            tags: ['links'],
            href: '/es/tutorials/enlaces.html',
            createdAt: new Date('2023-03-15'),
        },
    },
]

function run(app = { lang: 'en' }) {
    const withTags = getAppData({ app, pagesData })
    return { app: withTags, pagesData: getMetaData({ app: withTags, pagesData }) }
}

function outputPaths(result) {
    return result
        .filter(p => p.meta.tag)
        .map(p => path.posix.join(p.meta.dirname, p.meta.filename))
        .sort()
}

describe('group_by_lang', () => {
    it('generates one tag page per language, default language unprefixed', () => {
        writeConfig('group_by_lang: true\n')

        const { pagesData: result } = run()

        expect(outputPaths(result)).toEqual([
            '/de/tags/barrierefreiheit.html',
            '/de/tags/links.html',
            '/es/tags/links.html',
            '/tags/html.html',
            '/tags/links.html',
        ])
    })

    it('prefixes the whole configured tag_overview_path', () => {
        writeConfig('group_by_lang: true\ntag_overview_path: \'/tutorials/tags\'\n')

        const { pagesData: result } = run()

        expect(outputPaths(result)).toEqual([
            '/de/tutorials/tags/barrierefreiheit.html',
            '/de/tutorials/tags/links.html',
            '/es/tutorials/tags/links.html',
            '/tutorials/tags/html.html',
            '/tutorials/tags/links.html',
        ])
    })

    it('prefixes the default language too when asked', () => {
        writeConfig('group_by_lang: true\nprefix_default_lang: true\n')

        expect(outputPaths(run().pagesData)).toEqual([
            '/de/tags/barrierefreiheit.html',
            '/de/tags/links.html',
            '/en/tags/html.html',
            '/en/tags/links.html',
            '/es/tags/links.html',
        ])
    })

    // The segment is the language code, so each language owns a distinct path
    // by construction — nothing here has to defend against two of them
    // claiming one output file.
    it('gives every language a distinct set of output paths', () => {
        writeConfig('group_by_lang: true\n')

        const paths = outputPaths(run().pagesData)

        expect(new Set(paths).size).toBe(paths.length)
    })

    it('carries the language on each generated page', () => {
        writeConfig('group_by_lang: true\n')

        const { pagesData: result } = run()
        const german = result.filter(p => p.meta.tag && p.meta.lang === 'de')

        expect(german.map(p => p.meta.tagSlug).sort()).toEqual([
            'barrierefreiheit',
            'links',
        ])
    })

    it('lists only same-language pages on an overview page', () => {
        writeConfig('group_by_lang: true\n')

        const { pagesData: result } = run()
        const germanLinks = result.find(
            p => p.meta.tagSlug === 'links' && p.meta.lang === 'de'
        )

        expect(germanLinks.meta.taggedPages.map(p => p.meta.title)).toEqual([
            'Verweise',
        ])
    })

    it('links a page\'s tag chips to its own language', () => {
        writeConfig('group_by_lang: true\n')

        const { pagesData: result } = run()
        const spanish = result.find(p => p.meta.title === 'Enlaces')

        expect(spanish.meta.tagLinks.map(l => l.href)).toEqual([
            '/es/tags/links.html',
        ])
    })

    // The chips are what a reader actually clicks, so assert them through the
    // shipped partial and not only as data.
    it('renders a non-default language\'s chips through the shipped partial', () => {
        writeConfig('group_by_lang: true\n')

        const { pagesData: result } = run()
        const german = result.find(p => p.meta.title === 'Verweise')

        const $ = load(
            pug.renderFile(path.join(viewsDir, 'partials/tag-links.pug'), {
                meta: german.meta,
            })
        )

        expect($('.tag-links__item').map((_, el) => $(el).attr('href')).get()).toEqual([
            '/de/tags/links.html',
            '/de/tags/barrierefreiheit.html',
        ])
    })

    // The language segment and a configured sub-path have to compose, in both
    // directions of the prefix_default_lang switch.
    it('composes the language segment with a configured path for every language', () => {
        writeConfig(
            'group_by_lang: true\nprefix_default_lang: true\ntag_overview_path: \'/tutorials/tags\'\n'
        )

        expect(outputPaths(run().pagesData)).toEqual([
            '/de/tutorials/tags/barrierefreiheit.html',
            '/de/tutorials/tags/links.html',
            '/en/tutorials/tags/html.html',
            '/en/tutorials/tags/links.html',
            '/es/tutorials/tags/links.html',
        ])
    })

    it('sorts a language\'s tagged pages newest first', () => {
        writeConfig('group_by_lang: true\n')

        const german = [
            {
                content: '',
                meta: {
                    title: 'Älter',
                    lang: 'de',
                    tags: 'links',
                    href: '/de/alt.html',
                    createdAt: new Date('2023-01-01'),
                },
            },
            {
                content: '',
                meta: {
                    title: 'Neuer',
                    lang: 'de',
                    tags: 'links',
                    href: '/de/neu.html',
                    createdAt: new Date('2024-06-01'),
                },
            },
        ]

        const app = getAppData({ app: { lang: 'en' }, pagesData: german })
        const result = getMetaData({ app, pagesData: german })

        expect(
            result
                .find(p => p.meta.tagSlug === 'links')
                .meta.taggedPages.map(p => p.meta.title)
        ).toEqual(['Neuer', 'Älter'])
    })

    it('exposes a cloud per language and keeps app.tagCloud on the default one', () => {
        writeConfig('group_by_lang: true\n')

        const { app } = run()

        expect(Object.keys(app.tagCloudByLang)).toEqual(['de', 'en', 'es'])
        expect(app.tagCloudByLang.de.map(t => t.name)).toEqual([
            'barrierefreiheit',
            'links',
        ])
        expect(app.tagCloud).toEqual(app.tagCloudByLang.en)
        expect(app.tagCloud.map(t => t.href)).toEqual([
            '/tags/html.html',
            '/tags/links.html',
        ])
    })

    it('gives every page a cloud scoped to its language', () => {
        writeConfig('group_by_lang: true\n')

        const { pagesData: result } = run()

        expect(
            result.find(p => p.meta.title === 'Verweise').meta.tagCloud.map(t => t.href)
        ).toEqual(['/de/tags/barrierefreiheit.html', '/de/tags/links.html'])
    })

    // Same invariant the single-namespace integration test asserts: no link may
    // point at a page nobody writes.
    it('emits no tag link that points at a page nobody generates', () => {
        writeConfig('group_by_lang: true\ntag_overview_path: \'/tutorials/tags\'\n')

        const { app, pagesData: result } = run()

        const written = new Set(outputPaths(result))
        const linked = new Set([
            ...Object.values(app.tagCloudByLang).flatMap(c => c.map(t => t.href)),
            ...result.flatMap(p => p.meta.tagLinks.map(l => l.href)),
            ...result.flatMap(p => (p.meta.tagCloud || []).map(t => t.href)),
        ])

        expect([...linked].sort()).toEqual([...written].sort())
    })

    it('puts pages with no lang into the default language bucket', () => {
        writeConfig('group_by_lang: true\n')

        const untagged = [
            ...pagesData,
            {
                content: '',
                meta: {
                    title: 'No language',
                    tags: 'html',
                    href: '/misc.html',
                    createdAt: new Date('2023-04-01'),
                },
            },
        ]

        const app = getAppData({ app: { lang: 'en' }, pagesData: untagged })
        const result = getMetaData({ app, pagesData: untagged })
        const htmlPage = result.find(p => p.meta.tagSlug === 'html')

        expect(htmlPage.meta.lang).toBe('en')
        expect(htmlPage.meta.taggedPages.map(p => p.meta.title).sort()).toEqual([
            'Links',
            'No language',
        ])
    })

    it('renders the language-scoped cloud through the shipped partial', () => {
        writeConfig('group_by_lang: true\n')

        const { app, pagesData: result } = run()
        const german = result.find(p => p.meta.title === 'Verweise')

        const $ = load(
            pug.renderFile(path.join(viewsDir, 'partials/tag-cloud.pug'), {
                app,
                meta: german.meta,
            })
        )

        expect($('.tag-cloud__item').map((_, el) => $(el).attr('href')).get()).toEqual([
            '/de/tags/barrierefreiheit.html',
            '/de/tags/links.html',
        ])
    })

    it('prefers a per-language tag image on the generated overview', () => {
        writeConfig(
            [
                'group_by_lang: true',
                'tag_overview_links_image: /img/links.jpg',
                'tag_overview_de_links_image: /img/links-de.jpg',
                '',
            ].join('\n')
        )

        const { app, pagesData: result } = run()
        const render = page =>
            load(
                pug.renderFile(path.join(viewsDir, 'pages/tag-overview.pug'), {
                    app,
                    meta: page.meta,
                })
            )('.tag-overview__image').attr('src')

        expect(
            render(result.find(p => p.meta.tagSlug === 'links' && p.meta.lang === 'de'))
        ).toBe('/img/links-de.jpg')
        // Untouched languages keep falling back to the language-agnostic key.
        expect(
            render(result.find(p => p.meta.tagSlug === 'links' && p.meta.lang === 'es'))
        ).toBe('/img/links.jpg')
    })
})

describe('without group_by_lang', () => {
    it('keeps one global namespace even on a multilingual site', () => {
        const { app, pagesData: result } = run()

        expect(outputPaths(result)).toEqual([
            '/tags/barrierefreiheit.html',
            '/tags/html.html',
            '/tags/links.html',
        ])
        expect(app.tagCloud.map(t => t.href)).toEqual([
            '/tags/barrierefreiheit.html',
            '/tags/html.html',
            '/tags/links.html',
        ])

        // The one `links` page still lists all three languages, and no page
        // carries the per-page cloud that only grouping introduces.
        const links = result.find(p => p.meta.tagSlug === 'links')
        expect(links.meta.taggedPages).toHaveLength(3)
        expect(links.meta.lang).toBeUndefined()
        expect(result.every(p => p.meta.tagCloud === undefined)).toBe(true)
    })

    it('still exposes tagCloudByLang, keyed by the default language', () => {
        const { app } = run()

        expect(Object.keys(app.tagCloudByLang)).toEqual(['en'])
        expect(app.tagCloudByLang.en).toEqual(app.tagCloud)
    })
})
