import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const page = readFileSync(
  path.resolve(process.cwd(), 'src/app/(admin-protected)/admin/forms/page.tsx'),
  'utf8',
)

describe('structured admin form editor', () => {
  it('replaces the raw JSON editor with the FormField controls', () => {
    expect(page).not.toContain('fieldsJson')
    expect(page).not.toContain('Fields JSON')
    expect(page).not.toContain('JSON.parse(')
    for (const property of ['Field ID', 'Field type', 'Field label', 'Required', 'Consent flag']) {
      expect(page).toContain(property)
    }
    expect(page).toContain("const allowedFieldTypes: FormField['type'][] = ['text', 'email', 'textarea', 'select', 'radio', 'checkbox']")
    expect(page).toContain('full_name')
    expect(page).toContain('Email address')
    expect(page).toContain('Start new form')
  })

  it('supports bounded field ordering and individual option editing', () => {
    expect(page).toContain('MAX_FORM_FIELDS')
    expect(page).toContain('Add field')
    expect(page).toContain('Remove field')
    expect(page).toContain('Move up')
    expect(page).toContain('Move down')
    expect(page).toContain('Add option')
    expect(page).toContain('Remove option')
    expect(page).toContain('hasDuplicateOptions')
    expect(page).toContain('Option values must be unique.')
    expect(page).toContain('field.type === \'select\' || field.type === \'radio\'')
    expect(page).toContain('MAX_FORM_OPTIONS')
    expect(page).not.toContain('parseOptions')
    expect(page).not.toContain('value.split(/[\\n,]/)')
  })

  it('shows the consent flag only for checkbox fields', () => {
    expect(page).toContain("field.type === 'checkbox' && <label")
    expect(page).toContain('className="h-4 w-4"')
    expect(page).toContain('className="flex min-h-11 items-center gap-2 text-sm"')
  })

  it('keeps API persistence, selection, active state, and disable flows unchanged', () => {
    expect(page).toContain("fetch('/api/admin/events'")
    expect(page).toContain("fetch(`/api/admin/forms?eventId=${encodeURIComponent(nextEventId)}&kind=participant`")
    expect(page).toContain("fetch('/api/admin/forms', { method: 'POST'")
    expect(page).toContain("fetch(`/api/admin/forms?eventId=${encodeURIComponent(eventId)}&kind=participant`, { method: 'DELETE' })")
    expect(page).toContain("kind: 'participant'")
    expect(page).toContain('isActive')
    expect(page).toContain("body: JSON.stringify(body)")
    expect(page).not.toContain('destination')
    expect(page).not.toContain('webhookUrl')
    expect(page).not.toContain('appsScript')
  })
})
