import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(process.cwd(), 'src/components/ExternalEmbedOptIn.tsx'), 'utf8')

describe('ExternalEmbedOptIn', () => {
  it('does not load a third-party iframe until the visitor opts in', () => {
    expect(source).toContain("const [isLoaded, setIsLoaded] = useState(false)")
    expect(source).toContain('onClick={() => setIsLoaded(true)}')
    expect(source).toContain('The external panel stays closed until you choose to load it.')
  })

  it('renders a titled lazy iframe and fallback after explicit opt-in', () => {
    expect(source).toContain('<iframe')
    expect(source).toContain('src={src}')
    expect(source).toContain('title={title}')
    expect(source).toContain('loading="lazy"')
    expect(source).toContain('{fallbackCopy}')
    expect(source).toContain('href={src}')
  })
})
