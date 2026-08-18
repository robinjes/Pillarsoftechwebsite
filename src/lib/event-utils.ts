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

  if (/^(?:javascript|data|blob|file):/i.test(trimmed) || trimmed.startsWith('//')) {
    return undefined;
  }

  if (isAbsoluteUrl(trimmed)) {
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
  const heroImage = normalizeAssetPath(event.heroImage) || image;
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
    heroImage,
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
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      return null;
    }

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const videoIdPattern = /^[a-zA-Z0-9_-]{6,32}$/;

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.slice(1);
      return videoIdPattern.test(videoId)
        ? `https://www.youtube-nocookie.com/embed/${videoId}`
        : null;
    }

    if (host === 'youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) {
        const videoId = parsed.pathname.slice('/embed/'.length);
        return videoIdPattern.test(videoId)
          ? `https://www.youtube-nocookie.com/embed/${videoId}`
          : null;
      }

      const videoId = parsed.searchParams.get('v');
      if (!videoId || !videoIdPattern.test(videoId)) {
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
