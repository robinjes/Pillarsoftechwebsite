import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/data-store';

export async function GET() {
  const settings = dataStore.getSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  try {
    const settings = await request.json();
    dataStore.saveSettings(settings);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 400 });
  }
}
