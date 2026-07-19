#!/usr/bin/env node

import path from 'path'
import { fileURLToPath } from 'url'
import { publishTemplates } from '@nera-static/plugin-utils'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginName = 'plugin-tags'
const sourceDir = path.resolve(__dirname, '../views/')

const templateFiles = [
    'pages/tag-overview.pug',
    'partials/tag-cloud.pug',
    'partials/tag-links.pug'
]

const result = publishTemplates({
    pluginName,
    sourceDir,
    templateFiles,
    expectedPackageName: 'dummy', // for test-only override
})

process.exit(result ? 0 : 1)
