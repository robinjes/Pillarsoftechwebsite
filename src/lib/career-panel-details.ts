import type { PublicEvent } from '@/lib/content-contracts'

export function publicEventLocation(event: Pick<PublicEvent, 'id' | 'location'>): string {
  return event.id === 'career-panel-granada'
    ? 'Granada High School Student Union'
    : event.location || 'Location to be announced'
}

export const careerPanelAgenda = [
  { time: '5:00–5:10 PM', title: 'Welcome & Introduction', description: 'Kick off the evening with an overview of the event and meet the panelists.' },
  { time: '5:10–5:55 PM', title: 'Panel 1', description: 'Panelists share their career paths, lessons learned, and advice, followed by audience Q&A.' },
  { time: '5:55–6:15 PM', title: 'Interactive Activity', description: 'A hands-on group activity to get everyone moving and connecting.' },
  { time: '6:15–7:00 PM', title: 'Panel 2', description: 'Our second group of panelists shares their journeys, followed by audience Q&A.' },
  { time: '7:00–7:10 PM', title: 'Final Thoughts', description: 'Closing remarks and key takeaways from the evening.' },
  { time: '7:10–8:00 PM', title: 'Networking & Social', description: 'Stay to meet the panelists, ask your questions one-on-one, and connect with other attendees.' },
]
