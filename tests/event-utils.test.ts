import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventMediaSource, resolveEventImageAlt } from '@/lib/event-media';
import { normalizeAssetPath, toYouTubeEmbedUrl } from '@/lib/event-utils';

describe('event asset utilities', () => {
  it('normalizes public asset paths while preserving external URLs', () => {
    expect(normalizeAssetPath(' public\\images\\hero.jpg ')).toBe('/images/hero.jpg');
    expect(normalizeAssetPath('/images//hero.jpg')).toBe('/images/hero.jpg');
    expect(normalizeAssetPath('https://cdn.example.com/hero.jpg')).toBe(
      'https://cdn.example.com/hero.jpg'
    );
    expect(normalizeAssetPath('   ')).toBeUndefined();
    expect(normalizeAssetPath('data:text/plain,unsafe')).toBeUndefined();
    expect(normalizeAssetPath('//evil.example/asset.png')).toBeUndefined();
  });

  it('converts YouTube links to privacy-preserving embed URLs', () => {
    expect(toYouTubeEmbedUrl('https://www.youtube.com/watch?v=abc123&list=playlist&index=2')).toBe(
      'https://www.youtube-nocookie.com/embed/abc123?list=playlist&index=2'
    );
    expect(toYouTubeEmbedUrl('https://example.com/video')).toBeNull();
    expect(toYouTubeEmbedUrl('https://notyoutube.com/watch?v=abc123')).toBeNull();
    expect(toYouTubeEmbedUrl('https://youtube.com.evil.example/watch?v=abc123')).toBeNull();
    expect(toYouTubeEmbedUrl('http://youtube.com/watch?v=abc123')).toBeNull();
    expect(toYouTubeEmbedUrl('https://youtube.com/watch?v=../escape')).toBeNull();
  });

  it('prefers explicit hero, primary, and gallery descriptions before title fallbacks', () => {
    const event = {
      title: 'Family Science Night',
      media: {
        image: '/images/primary.jpg',
        imageAlt: '  Students test a circuit  ',
        heroImage: '/images/hero.jpg',
        heroImageAlt: 'Families gather around a STEM table',
        gallery: ['/images/gallery-one.jpg', '/images/gallery-two.jpg'],
        galleryAlts: ['Students build a model', 'A finished model on display'],
      },
    };

    expect(resolveEventImageAlt(event, 'hero', '/images/hero.jpg')).toBe('Families gather around a STEM table');
    expect(resolveEventImageAlt({ title: event.title, media: { image: event.media.image, heroImageAlt: 'Hero fallback description' } }, 'hero', event.media.image)).toBe('Hero fallback description');
    expect(resolveEventImageAlt(event, 'image', '/images/primary.jpg')).toBe('Students test a circuit');
    expect(resolveEventImageAlt(event, 'gallery', '/images/gallery-two.jpg', 1)).toBe('A finished model on display');
    expect(resolveEventImageAlt(event, 'gallery', '/images/unknown.jpg', 2)).toBe('Family Science Night event image 3');
    expect(resolveEventImageAlt({ title: event.title, media: { image: event.media.image }, imageAlt: 'Primary alias description' }, 'image', event.media.image)).toBe('Primary alias description');
  });
});


describe('approved event media delivery', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('displays finalized Supabase images and videos from the configured storage origin', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://approved.supabase.co');
    const source = 'https://approved.supabase.co/storage/v1/object/public/event-images/final/poster.webp';
    expect(eventMediaSource(source)).toBe(source);
    expect(eventMediaSource(source, 'video')).toBe(source);
    expect(eventMediaSource('https://other.supabase.co/storage/v1/object/public/photo.jpg')).toBeNull();
    expect(eventMediaSource('https://approved.supabase.co/storage/v1/object/sign/private/photo.jpg')).toBeNull();
  });

  it('accepts configured Cloudinary images and local assets without allowing arbitrary hosts', () => {
    vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'pillars');
    const source = 'https://res.cloudinary.com/pillars/image/upload/poster.jpg';
    expect(eventMediaSource(source)).toBe(source);
    expect(eventMediaSource(source, 'video')).toBeNull();
    expect(eventMediaSource('https://res.cloudinary.com/another/image/upload/poster.jpg')).toBeNull();
    expect(eventMediaSource('/images/events/poster.jpg')).toBe('/images/events/poster.jpg');
    for (const unsafe of ['//evil.example/photo.jpg', '/images/../secret.jpg', 'javascript:alert(1)', 'https://evil.example/photo.jpg']) {
      expect(eventMediaSource(unsafe)).toBeNull();
    }
  });
});
