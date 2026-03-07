import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_PASSWORD = 'PillarsAdmin2026!'; // Hardcoded password

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (password === ADMIN_PASSWORD) {
      // Set an HTTP-only cookie indicating the user is an admin
      const cookieStore = await cookies();
      cookieStore.set({
        name: 'admin_session',
        value: 'true',
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process login' }, { status: 400 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  return NextResponse.json({ success: true });
}
