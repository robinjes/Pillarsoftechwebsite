import { NextResponse } from 'next/server';
import { dataStore, FormSchema } from '@/lib/data-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  
  const forms = dataStore.getForms();
  
  if (eventId) {
    const form = forms.find(f => f.eventId === eventId);
    if (form) {
      return NextResponse.json(form);
    }
    return NextResponse.json({ error: 'Form not found for this event' }, { status: 404 });
  }
  
  return NextResponse.json(forms);
}

export async function POST(request: Request) {
  try {
    const newForm: FormSchema = await request.json();
    const forms = dataStore.getForms();
    
    if (!newForm.id) {
      newForm.id = `form-${Date.now()}`;
    }
    
    // Check if form for this event already exists and replace it
    const existingIndex = forms.findIndex(f => f.eventId === newForm.eventId);
    if (existingIndex !== -1) {
      forms[existingIndex] = newForm;
    } else {
      forms.push(newForm);
    }
    
    dataStore.saveForms(forms);
    
    return NextResponse.json({ success: true, form: newForm });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save form' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }
    
    const forms = dataStore.getForms();
    const newForms = forms.filter(f => f.eventId !== eventId);
    
    dataStore.saveForms(newForms);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete form' }, { status: 400 });
  }
}
