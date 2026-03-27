import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/data-store';
import { Event } from '@/data/events';
import { normalizeEvent } from '@/lib/event-utils';

export async function GET() {
  const events = dataStore.getEvents();
  return NextResponse.json(events);
}

export async function POST(request: Request) {
  try {
    const newEvent: Event = normalizeEvent(await request.json());
    const events = dataStore.getEvents();
    
    // Auto-generate id if not provided
    if (!newEvent.id) {
      newEvent.id = newEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    
    events.push(newEvent);
    dataStore.saveEvents(events);
    
    return NextResponse.json({ success: true, event: newEvent });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedEvent: Event = normalizeEvent(await request.json());
    const events = dataStore.getEvents();
    
    const index = events.findIndex(e => e.id === updatedEvent.id);
    if (index !== -1) {
      events[index] = updatedEvent;
      dataStore.saveEvents(events);
      return NextResponse.json({ success: true, event: updatedEvent });
    }
    
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update event' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }
    
    const events = dataStore.getEvents();
    const newEvents = events.filter(e => e.id !== id);
    
    if (events.length === newEvents.length) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    dataStore.saveEvents(newEvents);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 400 });
  }
}
