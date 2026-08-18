import { describe, expect, it } from 'vitest';
import { normalizeAssetPath, toYouTubeEmbedUrl } from '@/lib/event-utils';

describe('event asset utilities', () => {
  it('normalizes public asset paths while preserving external URLs', () => {
    expect(normalizeAssetPath(' public\\images\\hero.jpg ')).toBe('/images/hero.jpg');
    expect(normalizeAssetPath('/images//hero.jpg')).toBe('/images/hero.jpg');
    expect(normalizeAssetPath('https://cdn.example.com/hero.jpg')).toBe(
      'https://cdn.example.com/hero.jpg'
    );
    expect(normalizeAssetPath('   ')).toBeUndefined();
  });

  it('converts YouTube links to privacy-preserving embed URLs', () => {
    expect(toYouTubeEmbedUrl('https://www.youtube.com/watch?v=abc123&list=playlist&index=2')).toBe(
      'https://www.youtube-nocookie.com/embed/abc123?list=playlist&index=2'
    );
    expect(toYouTubeEmbedUrl('https://example.com/video')).toBeNull();
  });
});
