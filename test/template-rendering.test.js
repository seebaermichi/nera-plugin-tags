import { describe, it, expect } from 'vitest'
import { load } from 'cheerio'
import pug from 'pug'
import path from 'path'
import { fileURLToPath } from 'url'

// Resolved from this file rather than from `process.cwd()`, so the suite does
// not silently depend on vitest being started from the package root.
const viewsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../views')
const template = name => path.join(viewsDir, name)

describe('Tag templates', () => {
    describe('tag-cloud.pug', () => {
        it('renders tag cloud with links', () => {
            const templatePath = template('partials/tag-cloud.pug')
            const mockData = {
                app: {
                    tagCloud: [
                        { name: 'javascript', href: '/tags/javascript.html' },
                        { name: 'react', href: '/tags/react.html' },
                        { name: 'css', href: '/tags/css.html' }
                    ]
                }
            }

            const html = pug.renderFile(templatePath, mockData)
            const $ = load(html)

            expect($('.tag-cloud')).toHaveLength(1)
            expect($('.tag-cloud__item')).toHaveLength(3)
            expect($('.tag-cloud__item').eq(0).attr('href')).toBe('/tags/javascript.html')
            expect($('.tag-cloud__item').eq(0).text().trim()).toBe('javascript')
            expect($('.tag-cloud__item').eq(1).text().trim()).toBe('react')
            expect($('.tag-cloud__item').eq(2).text().trim()).toBe('css')
        })

        it('renders nothing when no tags exist', () => {
            const templatePath = template('partials/tag-cloud.pug')
            const mockData = {
                app: {
                    tagCloud: []
                }
            }

            const html = pug.renderFile(templatePath, mockData)
            const $ = load(html)

            expect($('a')).toHaveLength(0)
            expect($('.tag-cloud')).toHaveLength(0)
            expect(html.trim()).toBe('')
        })
    })

    describe('tag-links.pug', () => {
        it('renders tag links for a page', () => {
            const templatePath = template('partials/tag-links.pug')
            const mockData = {
                meta: {
                    tagLinks: [
                        { name: 'javascript', href: '/tags/javascript.html' },
                        { name: 'frontend', href: '/tags/frontend.html' }
                    ]
                }
            }

            const html = pug.renderFile(templatePath, mockData)
            const $ = load(html)

            expect($('.tag-links')).toHaveLength(1)
            expect($('.tag-links__item')).toHaveLength(2)
            expect($('.tag-links__item').eq(0).attr('href')).toBe('/tags/javascript.html')
            expect($('.tag-links__item').eq(0).text().trim()).toBe('javascript')
            expect($('.tag-links__item').eq(1).text().trim()).toBe('frontend')
        })

        it('renders nothing when page has no tags', () => {
            const templatePath = template('partials/tag-links.pug')
            const mockData = {
                meta: {
                    tagLinks: []
                }
            }

            const html = pug.renderFile(templatePath, mockData)
            const $ = load(html)

            expect($('a')).toHaveLength(0)
            expect($('.tag-links')).toHaveLength(0)
            expect(html.trim()).toBe('')
        })
    })

    describe('tag-overview.pug', () => {
        it('renders tag overview page with tagged pages', () => {
            const templatePath = template('pages/tag-overview.pug')
            const mockData = {
                app: {
                    lang: 'en',
                    tagsConfig: {
                        tag_overview_default_image: '/images/default-tag.jpg'
                    }
                },
                meta: {
                    title: 'javascript',
                    tag: 'javascript',
                    taggedPages: [
                        {
                            meta: {
                                title: 'Getting Started with JavaScript',
                                description: 'Learn the basics of JavaScript programming',
                                href: '/articles/js-basics.html',
                                createdAt: new Date('2023-01-15')
                            }
                        },
                        {
                            meta: {
                                title: 'Advanced JavaScript Concepts',
                                description: 'Deep dive into advanced JS topics',
                                href: '/articles/js-advanced.html',
                                createdAt: new Date('2023-02-10')
                            }
                        }
                    ]
                }
            }

            const html = pug.renderFile(templatePath, mockData)
            const $ = load(html)

            // Check main structure
            expect($('.tag-overview')).toHaveLength(1)
            expect($('.tag-overview__header')).toHaveLength(1)
            expect($('.tag-overview__content')).toHaveLength(1)

            // Check page title
            expect($('.tag-overview__title').text().trim()).toBe('javascript')

            // Check default image
            expect($('.tag-overview__image').attr('src')).toBe('/images/default-tag.jpg')

            // Check articles
            expect($('.tag-overview__item')).toHaveLength(2)
            expect($('.tag-overview__item-title').eq(0).text().trim()).toBe('Getting Started with JavaScript')
            expect($('.tag-overview__item-description').eq(0).text().trim()).toBe('Learn the basics of JavaScript programming')
            expect($('.tag-overview__item-link').eq(0).attr('href')).toBe('/articles/js-basics.html')
            expect($('.tag-overview__item-link').eq(0).text().trim()).toBe('Read more')
        })

        it('renders with custom tag-specific image', () => {
            const templatePath = template('pages/tag-overview.pug')
            const mockData = {
                app: {
                    lang: 'en',
                    tagsConfig: {
                        tag_overview_javascript_image: '/images/js-logo.jpg',
                        tag_overview_default_image: '/images/default-tag.jpg'
                    }
                },
                meta: {
                    title: 'javascript',
                    tag: 'javascript',
                    tagSlug: 'javascript',
                    taggedPages: []
                }
            }

            const html = pug.renderFile(templatePath, mockData)
            const $ = load(html)

            // Should use tag-specific image
            expect($('.tag-overview__image').attr('src')).toBe('/images/js-logo.jpg')
        })

        // A multi-word tag's image key follows the slug, so that the config
        // key is writable at all — `tag_overview_web development_image` is not.
        it('looks the tag-specific image up by slug', () => {
            const templatePath = template('pages/tag-overview.pug')
            const mockData = {
                app: {
                    lang: 'en',
                    tagsConfig: {
                        'tag_overview_web-development_image': '/images/webdev.jpg',
                        tag_overview_default_image: '/images/default-tag.jpg'
                    }
                },
                meta: {
                    title: 'web development',
                    tag: 'web development',
                    tagSlug: 'web-development',
                    taggedPages: []
                }
            }

            const html = pug.renderFile(templatePath, mockData)
            const $ = load(html)

            expect($('.tag-overview__image').attr('src')).toBe('/images/webdev.jpg')
        })

        // 2.x read `app.tagsConfig[...]` unguarded, so a site that published
        // this template and had no `config/tags.yaml` failed the whole build
        // with "Cannot read properties of undefined".
        it('renders without an app.tagsConfig instead of throwing', () => {
            const templatePath = template('pages/tag-overview.pug')
            const mockData = {
                app: { lang: 'en' },
                meta: {
                    title: 'javascript',
                    tag: 'javascript',
                    tagSlug: 'javascript',
                    taggedPages: []
                }
            }

            const html = pug.renderFile(templatePath, mockData)
            const $ = load(html)

            expect($('.tag-overview__title').text().trim()).toBe('javascript')
            expect($('.tag-overview__image')).toHaveLength(0)
        })

        it('handles empty tagged pages gracefully', () => {
            const templatePath = template('pages/tag-overview.pug')
            const mockData = {
                app: {
                    lang: 'en',
                    tagsConfig: {
                        tag_overview_default_image: '/images/default-tag.jpg'
                    }
                },
                meta: {
                    title: 'emptytag',
                    tag: 'emptytag',
                    taggedPages: []
                }
            }

            const html = pug.renderFile(templatePath, mockData)
            const $ = load(html)

            expect($('.tag-overview__title').text().trim()).toBe('emptytag')
            expect($('.tag-overview__item')).toHaveLength(0)
            expect($('.tag-overview__content')).toHaveLength(0)
        })
    })
})
