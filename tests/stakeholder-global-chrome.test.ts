import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), 'utf8')

describe('stakeholder global chrome contract', () => {
  it('keeps the approved five-entry primary navigation labels', () => {
    const navbar = read('src/components/Navbar.tsx')
    const primaryLinks = navbar.match(/const primaryLinks = \[([\s\S]*?)\n\]/)?.[1] ?? ''
    const labels = [...primaryLinks.matchAll(/label: '([^']+)'/g)].map((match) => match[1])

    expect(labels).toEqual(['For Families', 'Events', 'Our Work', 'Volunteer', 'Contact'])
  })

  it('uses the compact desktop logo width', () => {
    const brandMark = read('src/components/site/BrandMark.tsx')

    expect(brandMark).toContain('width={compact ? 240 : 280}')
  })

  it('makes desktop navigation links visible outlined pills', () => {
    const css = read('src/app/globals.css')
    const siteNavLink = css.match(/\.site-nav__link\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? ''

    expect(siteNavLink).toMatch(/border:\s*1px\s+solid\s+/)
    expect(siteNavLink).toMatch(/padding(?:-inline)?:\s*[^;]+;/)
    expect(siteNavLink).toContain('border-radius: 999px')
  })

  it('keeps the footer clean and the public page shell viewport-filling', () => {
    const footer = read('src/components/Footer.tsx')
    const css = read('src/app/globals.css')

    expect(footer).not.toContain('Family-friendly by design.')
    expect(css).toContain('min-height: 100svh')
    expect(css).toMatch(/#main-content\s*\{[\s\S]*flex:\s*1[;\s]/)
  })
})
