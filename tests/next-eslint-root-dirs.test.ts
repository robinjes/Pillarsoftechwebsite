import { createRequire } from 'node:module'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { Linter } from 'eslint'
import nextPlugin from '@next/eslint-plugin-next'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { getRootDirs } = require('@next/eslint-plugin-next/dist/utils/get-root-dirs') as {
  getRootDirs: (context: { cwd: string; settings: { next?: { rootDir?: string | Array<unknown> } } }) => string[]
}

describe('Next ESLint root directory discovery', () => {
  let fixtureRoot: string

  beforeEach(() => {
    fixtureRoot = mkdtempSync(path.join(process.cwd(), 'tests', '.next-eslint-root-dirs-'))
  })

  afterEach(() => {
    rmSync(fixtureRoot, { recursive: true, force: true })
  })

  it('uses the ESLint working directory when rootDir is not configured', () => {
    const cwd = path.join(fixtureRoot, 'project')

    expect(getRootDirs({ cwd, settings: {} })).toEqual([cwd])
  })

  it('matches a relative root glob and returns directories only', () => {
    const appsDirectory = path.join(fixtureRoot, 'relative-apps')
    const appRoot = path.join(appsDirectory, 'site')
    mkdirSync(appRoot, { recursive: true })
    writeFileSync(path.join(appsDirectory, 'README.md'), 'not a directory')

    const rootDir = path.relative(process.cwd(), path.join(appsDirectory, '*'))
    const rootDirs = getRootDirs({ cwd: process.cwd(), settings: { next: { rootDir } } })

    expect(rootDirs.map((dir) => path.resolve(dir))).toEqual([appRoot])
  })

  it('matches an absolute root glob and returns paths usable by Next rules', () => {
    const packagesDirectory = path.join(fixtureRoot, 'absolute-packages')
    const appRoot = path.join(packagesDirectory, 'site')
    mkdirSync(appRoot, { recursive: true })
    writeFileSync(path.join(packagesDirectory, 'README.md'), 'not a directory')

    const rootDirs = getRootDirs({
      cwd: process.cwd(),
      settings: { next: { rootDir: path.join(packagesDirectory, '*') } },
    })

    expect(rootDirs.map((dir) => path.resolve(dir))).toEqual([appRoot])
  })

  it('combines relative and absolute patterns from an array of roots', () => {
    const relativeRoot = path.join(fixtureRoot, 'relative-root')
    const absoluteRoot = path.join(fixtureRoot, 'absolute-root')
    mkdirSync(relativeRoot, { recursive: true })
    mkdirSync(absoluteRoot, { recursive: true })

    const rootDirs = getRootDirs({
      cwd: process.cwd(),
      settings: {
        next: {
          rootDir: [path.relative(process.cwd(), relativeRoot), absoluteRoot],
        },
      },
    })

    expect(rootDirs.map((dir) => path.resolve(dir))).toEqual([relativeRoot, absoluteRoot])
  })

  it('keeps Next internal-page link checks working across array roots', () => {
    const appRoot = path.join(fixtureRoot, 'app-package')
    const pagesRoot = path.join(fixtureRoot, 'pages-package')
    mkdirSync(path.join(appRoot, 'app'), { recursive: true })
    mkdirSync(path.join(pagesRoot, 'pages'), { recursive: true })
    writeFileSync(path.join(appRoot, 'app', 'page.jsx'), 'export default function Home() {}')
    writeFileSync(path.join(pagesRoot, 'pages', 'contact.jsx'), 'export default function Contact() {}')

    const linter = new Linter()
    const config: Linter.Config = {
      files: ['**/*.jsx'],
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { '@next/next': { rules: nextPlugin.rules } },
      settings: {
        next: {
          rootDir: [path.relative(process.cwd(), path.join(fixtureRoot, 'app-*')), path.join(fixtureRoot, 'pages-*')],
        },
      },
      rules: { '@next/next/no-html-link-for-pages': 'error' },
    }
    const messages = linter.verify(
      'const links = <><a href="/">Home</a><a href="/contact">Contact</a><a href="https://outside.test">Outside</a></>',
      config,
      { filename: path.join(fixtureRoot, 'links.jsx') },
    )

    expect(messages.map(({ message }) => message)).toEqual([
      expect.stringContaining('`/`'),
      expect.stringContaining('`/contact/`'),
    ])
  })
})
