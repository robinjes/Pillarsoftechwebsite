export interface Event {
  id: string
  title: string
  date: string
  time: string
  location: string
  description: string
  status: 'upcoming' | 'past'
  image?: string
  guests?: string[]
  stats?: { label: string; value: string }[]
  registrationLink?: string
  registrationNote?: string
}
