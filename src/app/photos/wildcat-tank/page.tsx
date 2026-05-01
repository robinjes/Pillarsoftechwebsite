import type { Metadata } from 'next'
import CloudinaryPhotoGallery from '@/components/CloudinaryPhotoGallery'
import { photoGalleries } from '@/data/photo-galleries'

const gallery = photoGalleries.wildcatTank

export const metadata: Metadata = {
  title: 'Wildcat Tank Photos | Pillars of Tech',
  description:
    'Browse photos from Wildcat Tank 2026 in a responsive Cloudinary-powered gallery.',
}

export default function WildcatTankPhotosPage() {
  return (
    <CloudinaryPhotoGallery
      title={gallery.title}
      description={gallery.description}
      folder={gallery.folder}
      photos={gallery.photos}
    />
  )
}
