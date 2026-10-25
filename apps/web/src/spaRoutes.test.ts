/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

describe('static route copies', () => {
  it('cover every top-level route in routes.tsx, so a refresh never 404s on the static host', () => {
    const routes = [...read('src/routes.tsx').matchAll(/path:\s*'([^']+)'/g)]
      .map((m) => m[1]!)
      .filter((p) => p !== '/' && p !== '*')
    const list = read('spaRoutes.ts').match(/SPA_ROUTES = \[([^\]]*)\]/)![1]!
    const copies = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]!)
    expect(copies.sort()).toEqual([...new Set(routes)].sort())
  })
})
