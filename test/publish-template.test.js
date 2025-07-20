import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const TEST_ROOT = path.resolve('.tmp/publish-template-test')
const SCRIPT_PATH = path.resolve('bin/publish-template.js')
const TEMPLATES_DEST = path.join(TEST_ROOT, 'views/vendor/plugin-tags/')
const DUMMY_PACKAGE = path.join(TEST_ROOT, 'package.json')

beforeEach(() => {
    // Clean test workspace
    fs.rmSync(TEST_ROOT, { recursive: true, force: true })
    fs.mkdirSync(TEST_ROOT, { recursive: true })
    fs.writeFileSync(DUMMY_PACKAGE, JSON.stringify({ name: 'dummy' }, null, 2))
})

afterEach(() => {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true })
})

describe('publish-template script', () => {
    it('copies all template files to the vendor directory', () => {
        // Run the publish-template script
        const result = execSync(`cd ${TEST_ROOT} && node ${SCRIPT_PATH}`, {
            encoding: 'utf-8',
        })

        // Check that the vendor directory was created
        expect(fs.existsSync(TEMPLATES_DEST)).toBe(true)

        // Check that template files were copied
        expect(fs.existsSync(path.join(TEMPLATES_DEST, 'pages'))).toBe(true)
        expect(fs.existsSync(path.join(TEMPLATES_DEST, 'partials'))).toBe(true)

        // Check specific template files
        expect(fs.existsSync(path.join(TEMPLATES_DEST, 'pages/tag-overview.pug'))).toBe(true)
        expect(fs.existsSync(path.join(TEMPLATES_DEST, 'partials/tag-cloud.pug'))).toBe(true)
        expect(fs.existsSync(path.join(TEMPLATES_DEST, 'partials/tag-links.pug'))).toBe(true)

        // Verify the output message
        expect(result).toContain('Templates copied to:')
        expect(result).toContain('views/vendor/plugin-tags')
    })

    it('skips if templates already exist', () => {
        // Create the destination directory first
        fs.mkdirSync(TEMPLATES_DEST, { recursive: true })

        // Run the publish-template script
        const result = execSync(`cd ${TEST_ROOT} && node ${SCRIPT_PATH}`, {
            encoding: 'utf-8',
        })

        // Verify the skip message
        expect(result).toContain('Templates already exist')
        expect(result).toContain('Skipping')
    })

    it('fails when not run from a Nera project', () => {
        // Remove the package.json to simulate non-Nera project
        fs.unlinkSync(DUMMY_PACKAGE)

        // Run the script and expect it to fail
        expect(() => {
            execSync(`cd ${TEST_ROOT} && node ${SCRIPT_PATH}`, {
                encoding: 'utf-8',
                stdio: 'pipe',
            })
        }).toThrow()
    })

    it('creates subdirectories when copying nested templates', () => {
        // Run the publish-template script
        execSync(`cd ${TEST_ROOT} && node ${SCRIPT_PATH}`, {
            encoding: 'utf-8',
        })

        // Check that subdirectories were created correctly
        expect(fs.existsSync(path.join(TEMPLATES_DEST, 'pages'))).toBe(true)
        expect(fs.existsSync(path.join(TEMPLATES_DEST, 'partials'))).toBe(true)

        // Check that files exist in correct subdirectories
        const pagesDir = path.join(TEMPLATES_DEST, 'pages')
        const partialsDir = path.join(TEMPLATES_DEST, 'partials')

        expect(fs.readdirSync(pagesDir)).toContain('tag-overview.pug')
        expect(fs.readdirSync(partialsDir)).toContain('tag-cloud.pug')
        expect(fs.readdirSync(partialsDir)).toContain('tag-links.pug')
    })
})
