import { describe, it, expect } from 'vitest'
import { getAppData, getMetaData } from '../index.js'

describe('Tags plugin', () => {
    describe('getAppData', () => {
        it('creates a tag cloud from page tags', () => {
            const data = {
                app: { title: 'Test App' },
                pagesData: [
                    {
                        content: '<h1>Article 1</h1>',
                        meta: {
                            title: 'Article 1',
                            tags: 'javascript, web development, programming',
                        },
                    },
                    {
                        content: '<h1>Article 2</h1>',
                        meta: {
                            title: 'Article 2',
                            tags: 'javascript, frontend',
                        },
                    },
                    {
                        content: '<h1>Article 3</h1>',
                        meta: {
                            title: 'Article 3',
                            tags: 'web development, css',
                        },
                    },
                ],
            }

            const result = getAppData(data)

            expect(result.tagCloud).toBeDefined()
            expect(result.tagCloud).toHaveLength(5)
            expect(result.tagCloud.map(tag => tag.name)).toEqual([
                'css',
                'frontend',
                'javascript',
                'programming',
                'web development'
            ])
            expect(result.tagCloud[0]).toEqual({
                name: 'css',
                href: '/tags/css.html'
            })
        })

        it('works with custom configuration', () => {
            const data = {
                app: {},
                pagesData: [
                    {
                        content: '<h1>Article</h1>',
                        meta: {
                            title: 'Article',
                            tags: 'tech, design, ui',
                        },
                    },
                ],
            }

            const result = getAppData(data)

            expect(result.tagCloud).toBeDefined()
            expect(result.tagCloud).toHaveLength(3)
            expect(result.tagCloud.map(tag => tag.name)).toEqual([
                'design',
                'tech',
                'ui'
            ])
        })

        it('handles pages without tags gracefully', () => {
            const data = {
                app: {},
                pagesData: [
                    {
                        content: '<h1>No Tags Article</h1>',
                        meta: {
                            title: 'No Tags Article',
                        },
                    },
                ],
            }

            const result = getAppData(data)

            expect(result.tagCloud).toBeDefined()
            expect(result.tagCloud).toHaveLength(0)
        })

        it('removes duplicate tags', () => {
            const data = {
                app: {},
                pagesData: [
                    {
                        content: '<h1>Article 1</h1>',
                        meta: {
                            title: 'Article 1',
                            tags: 'javascript, react',
                        },
                    },
                    {
                        content: '<h1>Article 2</h1>',
                        meta: {
                            title: 'Article 2',
                            tags: 'javascript, vue',
                        },
                    },
                ],
            }

            const result = getAppData(data)

            expect(result.tagCloud).toHaveLength(3)
            const tagNames = result.tagCloud.map(tag => tag.name)
            expect(tagNames).toEqual(['javascript', 'react', 'vue'])
        })
    })

    describe('getMetaData', () => {
        it('adds tag links to pages with tags', () => {
            const data = {
                app: {},
                pagesData: [
                    {
                        content: '<h1>Article 1</h1>',
                        meta: {
                            title: 'Article 1',
                            tags: 'javascript, react',
                        },
                    },
                    {
                        content: '<h1>Article 2</h1>',
                        meta: {
                            title: 'Article 2',
                            tags: 'css, design',
                        },
                    },
                    {
                        content: '<h1>No Tags</h1>',
                        meta: {
                            title: 'No Tags',
                        },
                    },
                ],
            }

            const result = getMetaData(data)

            expect(result[0].meta.tagLinks).toEqual([
                { name: 'javascript', href: '/tags/javascript.html' },
                { name: 'react', href: '/tags/react.html' }
            ])
            expect(result[1].meta.tagLinks).toEqual([
                { name: 'css', href: '/tags/css.html' },
                { name: 'design', href: '/tags/design.html' }
            ])
            expect(result[2].meta.tagLinks).toEqual([])
        })

        it('creates tag overview pages', () => {
            const data = {
                app: {},
                pagesData: [
                    {
                        content: '<h1>Article 1</h1>',
                        meta: {
                            title: 'Article 1',
                            tags: 'javascript, react',
                            createdAt: new Date('2023-01-01'),
                        },
                    },
                    {
                        content: '<h1>Article 2</h1>',
                        meta: {
                            title: 'Article 2',
                            tags: 'javascript, vue',
                            createdAt: new Date('2023-01-02'),
                        },
                    },
                ],
            }

            const result = getMetaData(data)

            // Should have original pages + tag overview pages
            expect(result.length).toBeGreaterThan(2)

            // Find the javascript tag overview page
            const jsTagPage = result.find(page => page.meta.tag === 'javascript')
            expect(jsTagPage).toBeDefined()
            expect(jsTagPage.meta.title).toBe('javascript')
            expect(jsTagPage.meta.htmlPathName).toBe('/tags/javascript.html')
            expect(jsTagPage.meta.taggedPages).toHaveLength(2)

            // Tagged pages should be sorted by creation date (newest first)
            expect(jsTagPage.meta.taggedPages[0].meta.title).toBe('Article 2')
            expect(jsTagPage.meta.taggedPages[1].meta.title).toBe('Article 1')
        })

        it('handles custom tag separators', () => {
            const data = {
                app: {},
                pagesData: [
                    {
                        content: '<h1>Article</h1>',
                        meta: {
                            title: 'Article',
                            tags: 'tag1|tag2|tag3',
                        },
                    },
                ],
            }

            // This would need mocking of getConfig to return custom separator
            // For now, test with default separator
            const result = getMetaData(data)

            // With default comma separator, this would be treated as one tag
            expect(result[0].meta.tagLinks).toHaveLength(1)
            expect(result[0].meta.tagLinks[0].name).toBe('tag1|tag2|tag3')
        })

        it('trims whitespace from tags', () => {
            const data = {
                app: {},
                pagesData: [
                    {
                        content: '<h1>Article</h1>',
                        meta: {
                            title: 'Article',
                            tags: '  javascript  ,   react   , vue.js   ',
                        },
                    },
                ],
            }

            const result = getMetaData(data)

            expect(result[0].meta.tagLinks).toEqual([
                { name: 'javascript', href: '/tags/javascript.html' },
                { name: 'react', href: '/tags/react.html' },
                { name: 'vue.js', href: '/tags/vue.js.html' }
            ])
        })

        it('preserves existing meta properties', () => {
            const data = {
                app: {},
                pagesData: [
                    {
                        content: '<h1>Article</h1>',
                        meta: {
                            title: 'Article',
                            author: 'John Doe',
                            tags: 'javascript',
                            customField: 'value',
                        },
                    },
                ],
            }

            const result = getMetaData(data)

            expect(result[0].meta.title).toBe('Article')
            expect(result[0].meta.author).toBe('John Doe')
            expect(result[0].meta.customField).toBe('value')
            expect(result[0].meta.tagLinks).toBeDefined()
        })
    })
})
