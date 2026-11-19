import fs from 'fs'
import os from 'os'
import path from 'path'
import pug from 'pug'
import { fileURLToPath } from 'url'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getConfig } from '@nera-static/plugin-utils'
import { getAppData, getMetaData } from '../index.js'

// `nera add tags` copies the package's own `config/tags.yaml` into a site that
// has none. Whatever is active in that file therefore becomes the site's
// config, so it may only hold the built-in defaults: a sample image or sample
// meta in it lands on every tag page of every fresh site.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const shippedConfigPath = path.join(rootDir, 'config/tags.yaml')
const overviewTemplate = path.join(rootDir, 'views/pages/tag-overview.pug')

// The fallbacks `loadConfig()` in index.js applies when a key is absent.
const BUILT_IN_DEFAULTS = {
    meta_property_name: 'tags',
    tag_overview_path: '/tags',
    tag_separator: ',',
    tag_overview_layout: 'pages/default.pug',
    group_by_lang: false,
    prefix_default_lang: false
}

const originalCwd = process.cwd()
let projectDir

beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nera-tags-shipped-'))
    process.chdir(projectDir)
})

afterEach(() => {
    process.chdir(originalCwd)
    fs.rmSync(projectDir, { recursive: true, force: true })
})

const pagesData = [
    {
        content: '',
        meta: {
            title: 'Getting Started with JavaScript',
            description: 'Learn the basics',
            href: '/articles/js-basics.html',
            createdAt: new Date('2026-01-02T00:00:00Z'),
            tags: 'javascript, web development'
        }
    },
    {
        content: '',
        meta: {
            title: 'CSS Grid Layout Guide',
            description: 'Master CSS Grid',
            href: '/articles/css-grid.html',
            createdAt: new Date('2026-02-03T00:00:00Z'),
            tags: 'css, web development'
        }
    }
]

// Runs both hooks in the current temp site and renders every tag page with
// the shipped overview template. `createdAt` of a generated tag page is the
// build moment, so it is dropped before comparing two builds.
function build() {
    const app = getAppData({ app: { lang: 'en' }, pagesData })
    const pages = getMetaData({ app, pagesData })
    // `tagsConfig` forwards the raw file, so it differs by design; what it
    // drives is compared through the rendered overviews below.
    const appWithoutConfig = { ...app }
    delete appWithoutConfig.tagsConfig

    return {
        app: appWithoutConfig,
        pages: pages.map(({ content, meta }) => {
            if (!meta.tagSlug) return { content, meta }

            // A generated tag page's createdAt is the build moment (`new Date()`).
            const stable = { ...meta }
            delete stable.createdAt

            return { content, meta: stable }
        }),
        overviews: pages
            .filter(({ meta }) => meta.tagSlug)
            .map(({ meta }) => pug.renderFile(overviewTemplate, { app, meta }))
    }
}

describe('shipped config/tags.yaml', () => {
    const shipped = getConfig(shippedConfigPath)

    it('activates no sample image and no sample meta', () => {
        const activeImageKeys = Object.keys(shipped).filter(key =>
            /^tag_overview_.*_image$/.test(key)
        )

        expect(activeImageKeys).toEqual([])
        expect(shipped).not.toHaveProperty('tag_overview_meta')
    })

    it('activates only keys whose value is the built-in default', () => {
        expect(shipped).toEqual(BUILT_IN_DEFAULTS)
    })

    it('still documents the examples as comments', () => {
        const text = fs.readFileSync(shippedConfigPath, 'utf-8')

        expect(text).toMatch(/^# tag_overview_meta:/m)
        expect(text).toMatch(/^# tag_overview_default_image:/m)
        expect(text).toMatch(/^# tag_overview_web-development_image:/m)
    })

    it('builds the same tag pages as a site without a config file', () => {
        const withoutFile = build()

        fs.mkdirSync(path.join(projectDir, 'config'))
        fs.copyFileSync(shippedConfigPath, path.join(projectDir, 'config/tags.yaml'))
        const withShippedFile = build()

        expect(withShippedFile.app).toEqual(withoutFile.app)
        expect(withShippedFile.pages).toEqual(withoutFile.pages)
        expect(withShippedFile.overviews).toEqual(withoutFile.overviews)
        expect(withShippedFile.overviews.join('')).not.toContain(
            'tag-overview__image'
        )
        expect(
            withShippedFile.pages.filter(({ meta }) => 'keywords' in meta)
        ).toEqual([])
    })
})
