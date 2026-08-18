import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/data-store';
import { authFailureResponse } from '@/lib/auth/http';
import { requireVerifiedStaff } from '@/lib/auth/server';

export async function GET() {
  const settings = dataStore.getSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff();
  if (!auth.ok) return authFailureResponse(auth);

  try {
    const settings = await request.json();
    dataStore.saveSettings(settings);
    return NextResponse.json({ success: true, settings });
  } catch {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 400 });
  }
}
