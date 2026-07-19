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
    // Shaped like a real Nera project rather than named 'dummy': the bin no
    // longer passes an `expectedPackageName` override, so what is exercised
    // here is the same validation a user's site goes through.
    fs.writeFileSync(DUMMY_PACKAGE, JSON.stringify({ name: 'my-site' }, null, 2))
    fs.mkdirSync(path.join(TEST_ROOT, 'config'), { recursive: true })
    fs.writeFileSync(path.join(TEST_ROOT, 'config/app.yaml'), 'lang: en\n')
    fs.mkdirSync(path.join(TEST_ROOT, 'pages'), { recursive: true })
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

    it('overwrites existing templates when --force is passed', () => {
        fs.mkdirSync(path.join(TEMPLATES_DEST, 'pages'), { recursive: true })
        fs.writeFileSync(
            path.join(TEMPLATES_DEST, 'pages/tag-overview.pug'),
            'p edited by the user\n'
        )

        const result = execSync(`cd ${TEST_ROOT} && node ${SCRIPT_PATH} --force`, {
            encoding: 'utf-8',
        })

        expect(result).toContain('Templates copied to:')
        expect(
            fs.readFileSync(path.join(TEMPLATES_DEST, 'pages/tag-overview.pug'), 'utf-8')
        ).toContain('tag-overview__title')
    })

    it('fails when not run from a Nera project', () => {
        // Strip every signal validateNeraProject looks for
        fs.unlinkSync(DUMMY_PACKAGE)
        fs.rmSync(path.join(TEST_ROOT, 'config'), { recursive: true, force: true })
        fs.rmSync(path.join(TEST_ROOT, 'pages'), { recursive: true, force: true })

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
