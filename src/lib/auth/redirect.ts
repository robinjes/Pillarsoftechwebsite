export const DEFAULT_AUTH_NEXT = '/admin'

/** Only accept a same-origin, root-relative destination. */
export function isSafeNextPath(value: string | null | undefined): value is string {
  return Boolean(
    value &&
      value.startsWith('/') &&
      !value.startsWith('//') &&
      !value.includes('\\') &&
      !/[\u0000-\u001f\u007f]/.test(value)
  )
}

export function getSafeNextPath(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_NEXT
): string {
  return isSafeNextPath(value) ? value : fallback
}
