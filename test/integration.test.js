import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { load } from 'cheerio'
import pug from 'pug'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getAppData, getMetaData } from '../index.js'

// The unit tests and the template tests both passed in 2.x while the plugin
// was unusable end to end, because nothing fed real plugin output into the
// shipped templates. That is what this file does.
const viewsDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../views'
)

const originalCwd = process.cwd()
let projectDir

beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nera-tags-int-'))
    process.chdir(projectDir)
})

afterEach(() => {
    process.chdir(originalCwd)
    fs.rmSync(projectDir, { recursive: true, force: true })
})

const pagesData = [
    {
        content: '<h1>JS basics</h1>',
        meta: {
            title: 'JS basics',
            description: 'Learn JavaScript',
            tags: 'JavaScript, web development',
            href: '/articles/js-basics.html',
            createdAt: new Date('2023-01-15'),
        },
    },
    {
        content: '<h1>Grid guide</h1>',
        meta: {
            title: 'Grid guide',
            description: 'Learn CSS Grid',
            tags: ['css', 'web development'],
            href: '/articles/grid.html',
            createdAt: new Date('2023-02-10'),
        },
    },
    {
        content: '<h1>Specificity</h1>',
        meta: {
            title: 'Specificity',
            description: 'Cascade rules',
            tags: 'CSS',
            href: '/articles/specificity.html',
            createdAt: new Date('2023-03-01'),
        },
    },
]

function run() {
    const app = getAppData({ app: { lang: 'en' }, pagesData })
    return { app, pagesData: getMetaData({ app, pagesData }) }
}

describe('plugin output against the shipped templates', () => {
    it('renders every generated tag page to a distinct, servable path', () => {
        const { pagesData: result } = run()
        const generated = result.filter(p => p.meta.tag)

        const outputPaths = generated.map(p =>
            path.posix.join(p.meta.dirname.replace(/^\/+/, ''), p.meta.filename)
        )

        expect(outputPaths.sort()).toEqual([
            'tags/css.html',
            'tags/javascript.html',
            'tags/web-development.html',
        ])
    })

    it('renders tag-overview.pug from real plugin data with no config file', () => {
        const { app, pagesData: result } = run()
        const cssPage = result.find(p => p.meta.tagSlug === 'css')

        const html = pug.renderFile(path.join(viewsDir, 'pages/tag-overview.pug'), {
            app,
            meta: cssPage.meta,
        })
        const $ = load(html)

        // Both `CSS` and `css` land on this one page, newest first
        expect($('.tag-overview__item')).toHaveLength(2)
        expect($('.tag-overview__item-title').eq(0).text().trim()).toBe('Specificity')
        expect($('.tag-overview__item-title').eq(1).text().trim()).toBe('Grid guide')
        expect($('.tag-overview__image')).toHaveLength(0)
    })

    it('shows the configured tag image on the generated page', () => {
        fs.mkdirSync(path.join(projectDir, 'config'), { recursive: true })
        fs.writeFileSync(
            path.join(projectDir, 'config/tags.yaml'),
            'tag_overview_web-development_image: /img/webdev.jpg\n',
            'utf-8'
        )

        const { app, pagesData: result } = run()
        const page = result.find(p => p.meta.tagSlug === 'web-development')

        const html = pug.renderFile(path.join(viewsDir, 'pages/tag-overview.pug'), {
            app,
            meta: page.meta,
        })

        expect(load(html)('.tag-overview__image').attr('src')).toBe('/img/webdev.jpg')
    })

    // Every href the cloud and the per-page links emit must correspond to a
    // page that is actually written, or the site 404s on its own links.
    it('emits no tag link that points at a page nobody generates', () => {
        const { app, pagesData: result } = run()

        const written = new Set(
            result
                .filter(p => p.meta.tag)
                .map(p => path.posix.join(p.meta.dirname, p.meta.filename))
        )

        const linked = new Set([
            ...app.tagCloud.map(t => t.href),
            ...result.flatMap(p => p.meta.tagLinks.map(l => l.href)),
        ])

        expect([...linked].sort()).toEqual([...written].sort())
    })

    it('renders the cloud and per-page links through the shipped partials', () => {
        const { app, pagesData: result } = run()

        const cloud = load(
            pug.renderFile(path.join(viewsDir, 'partials/tag-cloud.pug'), { app })
        )
        expect(cloud('.tag-cloud__item').map((_, el) => cloud(el).attr('href')).get()).toEqual([
            '/tags/css.html',
            '/tags/javascript.html',
            '/tags/web-development.html',
        ])

        const links = load(
            pug.renderFile(path.join(viewsDir, 'partials/tag-links.pug'), {
                meta: result[0].meta,
            })
        )
        expect(links('.tag-links__item').map((_, el) => links(el).text().trim()).get()).toEqual([
            'JavaScript',
            'web development',
        ])
        expect(links('.tag-links__item').eq(0).attr('href')).toBe('/tags/javascript.html')
    })
})
