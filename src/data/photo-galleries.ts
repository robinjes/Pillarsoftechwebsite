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
        alt: 'Volunteers guide children building marshmallow structures at outdoor tables during Wildcat Tank.',
        publicId: 'wildcat-tank-2026/Outdoor1',
      },
      {
        alt: 'Students test marshmallow structures with volunteers during Wildcat Tank.',
        publicId: 'wildcat-tank-2026/Outdoor2',
      },
      {
        alt: 'Four Wildcat Tank judges pose at the presentation table.',
        publicId: 'wildcat-tank-2026/Judges+Gatty',
      },
    ],
  },
}
