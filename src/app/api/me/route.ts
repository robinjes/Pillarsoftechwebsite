import { getMeResponse } from '@/lib/me-route'

export async function GET() {
  return getMeResponse()
}
