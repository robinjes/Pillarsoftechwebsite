import { Event } from '@/data/events';

const WILDCAT_TANK_FALLBACK_PDF = '/Wildcat%20Tank%20Official%20Manual.pdf';
const WILDCAT_TANK_FALLBACK_VIDEOS = [
  'https://www.youtube.com/watch?v=ZT57W8NaZeU',
];

function isAbsoluteUrl(value: string) {
  return /^(https?:)?\/\//i.test(value);
}

export function normalizeAssetPath(asset?: string | null) {
  if (!asset) {
    return undefined;
  }

  const trimmed = asset.trim().replace(/\\/g, '/');
  if (!trimmed) {
    return undefined;
  }

  if (isAbsoluteUrl(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const withoutPublicPrefix = trimmed.replace(/^\.?\/?public\/+/i, '');
  const normalized = withoutPublicPrefix.startsWith('/') ? withoutPublicPrefix : `/${withoutPublicPrefix}`;
  return normalized.replace(/\/{2,}/g, '/');
}

function normalizeStringList(values?: string[]) {
  if (!Array.isArray(values)) {
    return undefined;
  }

  const normalized = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeEvent(event: Event): Event {
  const gallery = (event.gallery || [])
    .map((asset) => normalizeAssetPath(asset))
    .filter((asset): asset is string => Boolean(asset));
  const image = normalizeAssetPath(event.image) || gallery[0];
  const heroVideo = normalizeAssetPath(event.heroVideo);
  const pdfUrl =
    normalizeAssetPath(event.pdfUrl) ||
    (event.id === 'wildcat-tank-altamont' ? WILDCAT_TANK_FALLBACK_PDF : undefined);
  const youtubeVideos =
    normalizeStringList(event.youtubeVideos) ||
    (event.id === 'wildcat-tank-altamont' ? WILDCAT_TANK_FALLBACK_VIDEOS : undefined);

  return {
    ...event,
    image,
    heroVideo,
    gallery: gallery.length > 0 ? gallery : undefined,
    pdfUrl,
    youtubeVideos,
    registrationLink: event.registrationLink?.trim() || undefined,
    registrationNote: event.registrationNote?.trim() || undefined,
  };
}

export function normalizeEvents(events: Event[]) {
  return events.map(normalizeEvent);
}

export function toYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.slice(1);
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }

    if (host.endsWith('youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) {
        return `https://www.youtube-nocookie.com${parsed.pathname}`;
      }

      const videoId = parsed.searchParams.get('v');
      if (!videoId) {
        return null;
      }

      const embed = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
      const list = parsed.searchParams.get('list');
      const index = parsed.searchParams.get('index');

      if (list) {
        embed.searchParams.set('list', list);
      }
      if (index) {
        embed.searchParams.set('index', index);
      }

      return embed.toString();
    }
  } catch {
    return null;
  }

  return null;
}
