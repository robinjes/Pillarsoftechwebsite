#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const workflowDirectory = join(process.cwd(), '.github', 'workflows')
const workflowFiles = readdirSync(workflowDirectory)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .sort()

if (workflowFiles.length === 0) throw new Error('No GitHub workflow files were found.')

const usesLine = /^\s*uses:\s*([^\s@]+)@([^\s#]+)(?:\s+#.*)?$/
for (const name of workflowFiles) {
  const path = join(workflowDirectory, name)
  const source = readFileSync(path, 'utf8')
  for (const [lineNumber, line] of source.split('\n').entries()) {
    if (!/^\s*uses:/.test(line)) continue
    const match = line.match(usesLine)
    if (!match || !/^[0-9a-f]{40}$/.test(match[2])) {
      throw new Error(`${name}:${lineNumber + 1} must pin its action to a 40-character SHA.`)
    }
  }

  if (name === 'ci.yml') {
    const required = [
      'database-policies:',
      'supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520',
      'version: 2.114.0',
      'run: supabase start',
      'run: supabase db reset',
      'run: supabase test db',
      'if: always()',
      'run: supabase stop',
    ]
    for (const fragment of required) {
      if (!source.includes(fragment)) throw new Error(`ci.yml is missing required database-policy fragment: ${fragment}`)
    }
  }
}

console.log(`Validated ${workflowFiles.length} workflow file(s): immutable action pins and database-policy job are present.`)
