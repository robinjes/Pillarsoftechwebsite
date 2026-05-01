export type GalleryPhoto = {
  alt: string
  publicId: string
}

export type GalleryCollection = {
  title: string
  description: string
  folder: string
  photos: GalleryPhoto[]
}

export const photoGalleries: Record<string, GalleryCollection> = {
  wildcatTank: {
    title: 'Wildcat Tank',
    description:
      'A few favorite moments from Wildcat Tank 2026, captured throughout the event day.',
    folder: 'wildcat-tank-2026',
    photos: [
      {
        alt: 'Students and attendees gathered outside during Wildcat Tank.',
        publicId: 'wildcat-tank-2026/Outdoor1',
      },
      {
        alt: 'Another outdoor Wildcat Tank event moment with students and families.',
        publicId: 'wildcat-tank-2026/Outdoor2',
      },
      {
        alt: 'Wildcat Tank judges and attendees during the event.',
        publicId: 'wildcat-tank-2026/Judges+Gatty',
      },
    ],
  },
}
