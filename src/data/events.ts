export interface Event {
  id: string
  title: string
  date: string
  time: string
  location: string
  description: string
  status: 'upcoming' | 'past'
  image?: string
  heroVideo?: string
  gallery?: string[]
  guests?: string[]
  stats?: { label: string; value: string }[]
  registrationLink?: string
  registrationNote?: string
  pdfUrl?: string          // ← ADD THIS
  youtubeVideos?: string[] // ← ADD THIS
}
