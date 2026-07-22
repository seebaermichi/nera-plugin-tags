import { describe, it, expect } from 'vitest'
import { load } from 'cheerio'
import fs from 'fs'
import path from 'path'
import pug from 'pug'
import { fileURLToPath } from 'url'
import { getAppData, getMetaData } from '../index.js'

// The README's "Generated Output → Markup" block was produced by rendering the
// shipped templates, not written by hand. This suite keeps it that way: a
// template change that does not reach the README fails here rather than
// shipping a README that documents markup the plugin no longer emits.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const viewsDir = path.join(rootDir, 'views')
const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf-8')

// The two authored pages the README's block says it was generated from.
const pagesData = [
    {
        content: '',
        meta: {
            title: 'Getting Started with JavaScript',
            description: 'Learn the basics of JavaScript programming',
            href: '/articles/js-basics.html',
            createdAt: new Date('2026-01-02T00:00:00Z'),
            tags: 'javascript, web development'
        }
    },
    {
        content: '',
        meta: {
            title: 'CSS Grid Layout Guide',
            description: 'Master CSS Grid for modern web layouts',
            href: '/articles/css-grid.html',
            createdAt: new Date('2026-02-03T00:00:00Z'),
            tags: 'css, web development'
        }
    }
]

function render(templateName, locals) {
    return pug
        .renderFile(path.join(viewsDir, templateName), locals)
        .trim()
}

function pluginOutput() {
    const app = getAppData({ app: { lang: 'en' }, pagesData })
    const pages = getMetaData({ app, pagesData })

    return {
        // Vitest runs from the package root, so `getConfig` picks up this
        // repo's own `config/tags.yaml` — which sets a demo
        // `tag_overview_default_image` and would render an extra
        // `.tag-overview__image`. The README block documents the default,
        // no-config output, so blank it out to match.
        app: { ...app, tagsConfig: {} },
        tagPage: pages.find(page => page.meta.tagSlug === 'web-development'),
        cssPage: pages.find(page => page.meta.title === 'CSS Grid Layout Guide')
    }
}

// Every `<section …>` line inside the README's ```html fences, so a lookup is
// by content rather than by fence index — reordering the block is fine, losing
// it is not.
const documentedSections = readme
    .split('```html')
    .slice(1)
    .flatMap(block => block.split('```')[0].split('\n'))
    .map(line => line.trim())

describe('README Generated Output block', () => {
    it('documents the tag cloud the shipped template renders', () => {
        const { app, cssPage } = pluginOutput()
        const html = render('partials/tag-cloud.pug', {
            app,
            meta: cssPage.meta
        })

        expect(documentedSections).toContain(html)
    })

    it('documents the tag links the shipped template renders', () => {
        const { app, cssPage } = pluginOutput()
        const html = render('partials/tag-links.pug', {
            app,
            meta: cssPage.meta
        })

        expect(documentedSections).toContain(html)
    })

    it('documents the tag overview the shipped template renders', () => {
        const { app, tagPage } = pluginOutput()
        const rendered = load(render('pages/tag-overview.pug', {
            app,
            meta: tagPage.meta
        }))

        // The README block is pretty-printed and its `<time>` text is
        // locale-dependent, so compare the parts that are neither: the class
        // sequence, the headings and the links.
        const documented = load(
            readme.split('```html')[1].split('```')[0] +
                readme.split('```html')[2].split('```')[0]
        )

        const shape = $ => ({
            classes: $('[class]')
                .map((_, el) => $(el).attr('class'))
                .get(),
            text: $('.tag-overview__item-title, .tag-overview__title')
                .map((_, el) => $(el).text().trim())
                .get(),
            hrefs: $('.tag-overview__item-link')
                .map((_, el) => $(el).attr('href'))
                .get()
        })

        const documentedShape = shape(documented)
        const renderedShape = shape(rendered)

        // The documented block also carries the two partials, so compare only
        // the overview's own classes.
        const overviewOnly = list =>
            list.filter(cls => cls.startsWith('tag-overview'))

        expect(overviewOnly(documentedShape.classes)).toEqual(
            overviewOnly(renderedShape.classes)
        )
        expect(documentedShape.text).toEqual(renderedShape.text)
        expect(documentedShape.hrefs).toEqual(renderedShape.hrefs)
    })
})
