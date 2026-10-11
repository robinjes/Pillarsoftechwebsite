import type { PublicEvent } from '@/lib/content-contracts'

export function publicEventLocation(event: Pick<PublicEvent, 'id' | 'location'>): string {
  return event.id === 'career-panel-granada'
    ? 'Granada High School Student Union'
    : event.location || 'Location to be announced'
}

export const careerPanelAgenda = [
  { time: '5:30–5:40 PM', title: 'Welcome & Introduction', description: 'Kick off the evening with an overview of the event and meet the panelists.' },
  { time: '5:40–6:25 PM', title: 'Panel 1', description: 'Panelists share their career paths, lessons learned, and advice, followed by audience Q&A.' },
  { time: '6:25–6:45 PM', title: 'Interactive Activity', description: 'A hands-on group activity to get everyone moving and connecting.' },
  { time: '6:45–7:30 PM', title: 'Panel 2', description: 'Our second group of panelists shares their journeys, followed by audience Q&A.' },
  { time: '7:30–7:40 PM', title: 'Final Thoughts', description: 'Closing remarks and key takeaways from the evening.' },
  { time: '7:40–8:30 PM', title: 'Networking & Social', description: 'Stay to meet the panelists, ask your questions one-on-one, and connect with other attendees.' },
]
