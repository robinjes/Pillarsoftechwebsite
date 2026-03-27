import fs from 'fs';
import path from 'path';
import { Event } from '@/data/events';
import { normalizeEvents } from '@/lib/event-utils';

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'textarea' | 'select' | 'radio' | 'checkbox';
  label: string;
  required: boolean;
  options?: string[]; // for select, radio
}

export interface FormSchema {
  id: string; // usually linked to an event id
  eventId: string;
  fields: FormField[];
  isActive: boolean;
  appsScriptUrl?: string;
}

export interface Settings {
  appsScriptUrl: string;
}

const EVENTS_PATH = path.join(process.cwd(), 'src/data/events.json');
const FORMS_PATH = path.join(process.cwd(), 'src/data/forms.json');
const SETTINGS_PATH = path.join(process.cwd(), 'src/data/settings.json');

// Helper to make sure directory/files exist or create them
function ensureFileExists(filePath: string, defaultData: string) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, defaultData, 'utf-8');
  }
}

// Initialize files if they don't exist
ensureFileExists(EVENTS_PATH, '[]');
ensureFileExists(FORMS_PATH, '[]');
ensureFileExists(SETTINGS_PATH, JSON.stringify({ appsScriptUrl: '' }));

export const dataStore = {
  // Events
  getEvents: (): Event[] => {
    try {
      const data = fs.readFileSync(EVENTS_PATH, 'utf-8');
      return normalizeEvents(JSON.parse(data));
    } catch {
      return [];
    }
  },
  saveEvents: (events: Event[]) => {
    fs.writeFileSync(EVENTS_PATH, JSON.stringify(normalizeEvents(events), null, 2), 'utf-8');
  },

  // Forms
  getForms: (): FormSchema[] => {
    try {
      const data = fs.readFileSync(FORMS_PATH, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  },
  saveForms: (forms: FormSchema[]) => {
    fs.writeFileSync(FORMS_PATH, JSON.stringify(forms, null, 2), 'utf-8');
  },

  // Settings
  getSettings: (): Settings => {
    try {
      const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { appsScriptUrl: '' };
    }
  },
  saveSettings: (settings: Settings) => {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
  }
};
