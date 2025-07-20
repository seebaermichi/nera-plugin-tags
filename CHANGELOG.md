# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-07-20

### Added

-   **BREAKING**: Complete rewrite for Nera v4.1.0 compatibility
-   Professional CHANGELOG.md for release tracking
-   Enhanced template publishing system via `@nera-static/plugin-utils@^1.1.0`
-   BEM CSS methodology for all tag templates:
    -   `.tag-cloud` and `.tag-cloud__item` classes
    -   `.tag-links` and `.tag-links__item` classes
    -   `.tag-overview` with semantic sub-elements
-   Comprehensive test suite with 20 tests covering:
    -   Unit tests for core tag functionality
    -   Integration tests for template publishing
    -   Template rendering tests for all Pug templates
-   CLI tool `npx @nera-static/plugin-tags run publish-template` for template publishing
-   ESLint configuration with modern JavaScript standards
-   Support for custom tag separators (comma, pipe, etc.)
-   Tag-specific image configuration for overview pages
-   Proper URL-safe tag generation (spaces to hyphens, lowercase)

### Changed

-   **BREAKING**: Migrated from CommonJS to ES modules
-   **BREAKING**: Package name changed to `@nera-static/plugin-tags`
-   **BREAKING**: Now uses `@nera-static/plugin-utils` instead of legacy configuration loading
-   **BREAKING**: Configuration loading moved from plugin directory to project root
-   Enhanced package.json with modern configuration and proper dependencies
-   Improved tag overview template structure with semantic HTML
-   Updated all templates to use BEM CSS methodology
-   Enhanced README.md with comprehensive documentation following plugin standards

### Fixed

-   **Critical Fix**: Configuration now loads from project's `config/tags.yaml` instead of plugin directory
-   Template rendering properly handles missing images and empty tag lists
-   Tag cloud generation now correctly deduplicates and sorts tags alphabetically
-   Tag overview pages properly sort tagged content by creation date (newest first)

### Technical Details

-   Migrated to ES modules with proper `import`/`export` syntax
-   Uses modern `getAppData()` and `getMetaData()` exports for Nera v4.1.0
-   Leverages `@nera-static/plugin-utils` for configuration and template publishing
-   All templates follow BEM CSS naming conventions for better maintainability
-   Comprehensive test coverage using Vitest testing framework
-   Proper semantic versioning and npm package structure

### Template Structure

Templates now use standardized BEM CSS classes:

```
views/vendor/plugin-tags/
├── pages/
│   └── tag-overview.pug          # .tag-overview, .tag-overview__header, etc.
└── partials/
    ├── tag-cloud.pug             # .tag-cloud, .tag-cloud__item
    └── tag-links.pug             # .tag-links, .tag-links__item
```

### Migration from v1.x

1. Update package name: `@nera-static/plugin-tags`
2. Move `config/tags.yaml` to project root if using custom configuration
3. Update template includes to use `/vendor/plugin-tags/` paths
4. Update CSS to use new BEM class names
5. Use `npx @nera-static/plugin-tags run publish-template` instead of manual copying

## [1.x.x] - Legacy Versions

Previous versions were part of the original Nera plugin ecosystem before the v4.1.0 modernization. See git history for detailed changes in legacy versions.
