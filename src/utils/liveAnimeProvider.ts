import { Anime } from '../types.js';
import localAnimeData from '../data/anime_data.json';

// Caching structure with TTL (Time To Live) in milliseconds
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cache = {
  search: new Map<string, CacheEntry<{ total: number; data: Anime[]; genres: string[] }>>(),
  details: new Map<number, CacheEntry<Anime>>(),
  recommendations: new Map<number, CacheEntry<Anime[]>>(),
  studios: new Map<string, CacheEntry<Array<{ id: number; name: string }>>>(),
  genres: new Map<string, CacheEntry<string[]>>(),
};

// Global pool of loaded anime to feed our recommendation engine dynamically
export const globalAnimePool = new Map<number, Anime>();

// Default list of high-quality anime genres
export const DEFAULT_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Horror',
  'Mecha',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Suspense',
  'Thriller'
];

/**
 * Normalizes user genre input strings to exactly match AniList's schema casing
 */
function normalizeGenreForAniList(genre: string): string {
  const mapping: { [key: string]: string } = {
    'action': 'Action',
    'adventure': 'Adventure',
    'comedy': 'Comedy',
    'drama': 'Drama',
    'sci-fi': 'Sci-Fi',
    'fantasy': 'Fantasy',
    'suspense': 'Suspense',
    'slice of life': 'Slice of Life',
    'romance': 'Romance',
    'supernatural': 'Supernatural',
    'mystery': 'Mystery',
    'sports': 'Sports',
    'ecchi': 'Ecchi',
    'mecha': 'Mecha',
    'thriller': 'Thriller',
    'psychological': 'Psychological',
    'horror': 'Horror',
    'award winning': 'Award Winning',
    'boys love': 'Boys Love',
    'girls love': 'Girls Love',
  };
  const lower = genre.toLowerCase().trim();
  if (mapping[lower]) return mapping[lower];
  return lower.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * General fetch function with retry capability and exponential backoff
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        // Rate limit hit, wait longer and retry
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay * 2;
        console.warn(`[API Rate Limit 429] Waiting ${waitMs}ms before retry... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Network Retry] Failed to fetch. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries}). Error: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw lastError || new Error(`Failed to fetch from ${url} after ${retries} retries`);
}

function formatSourceMaterial(rawSource: string | undefined | null): string | undefined {
  if (!rawSource) return undefined;
  const s = rawSource.toUpperCase().replace(/_/g, ' ');
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

/**
 * Maps a raw AniList media object into our clean, standard frontend Anime schema
 */
export function mapAniListMediaToAnime(media: any): Anime {
  const title = media.title?.romaji || media.title?.english || media.title?.native || 'Unknown Title';
  const english_title = media.title?.english || media.title?.romaji || 'Unknown Title';
  const score = media.averageScore ? media.averageScore / 10 : 0;
  
  const cleanSynopsis = media.description
    ? media.description.replace(/<[^>]*>/g, '').trim()
    : 'No synopsis available.';

  const genres = media.genres || [];
  const studio = media.studios?.nodes?.[0]?.name || 'Unknown Studio';
  const image = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || '';

  const anime: Anime = {
    mal_id: media.idMal || media.id,
    title,
    english_title,
    native_title: media.title?.native || undefined,
    synonyms: media.synonyms || [],
    genres,
    synopsis: cleanSynopsis,
    score,
    popularity: media.popularity || 99999,
    type: media.type || 'TV',
    episodes: media.episodes || 0,
    status: media.status || 'FINISHED',
    year: media.seasonYear || media.startDate?.year || 0,
    studio,
    image,
    format: media.format || media.type || 'TV',
    season: media.season ? media.season.toUpperCase() : undefined,
    source: formatSourceMaterial(media.source),
    duration: media.duration ? `${media.duration} min` : undefined,
    rating: media.isAdult ? 'R - 18+' : (media.isAdult === false ? 'PG-13' : undefined),
    bannerImage: media.bannerImage || undefined,
    trailer: media.trailer ? {
      id: media.trailer.id,
      site: media.trailer.site,
      embedUrl: media.trailer.site === 'youtube' ? `https://www.youtube.com/embed/${media.trailer.id}` : undefined
    } : null,
  };

  if (media.characters?.edges) {
    anime.characters = media.characters.edges.map((edge: any) => {
      const va = edge.voiceActors?.[0];
      return {
        id: edge.node.id,
        name: edge.node.name?.full || 'Unknown Character',
        role: edge.role || 'SUPPORTING',
        image: edge.node.image?.large || '',
        voiceActor: va ? {
          name: va.name?.full || 'Unknown VA',
          image: va.image?.large || '',
        } : null
      };
    });
  }

  if (media.relations?.edges) {
    anime.relations = media.relations.edges
      .filter((edge: any) => edge.node?.type === 'ANIME')
      .map((edge: any) => ({
        mal_id: edge.node.idMal || edge.node.id,
        title: edge.node.title?.english || edge.node.title?.romaji || 'Unknown',
        relationType: edge.relationType || 'RELATION',
        type: edge.node.type || 'TV',
        image: edge.node.coverImage?.large || ''
      }));
  }

  // Save parsed anime dynamically into the globalPool
  globalAnimePool.set(anime.mal_id, anime);

  return anime;
}

/**
 * Maps raw Jikan details response into our clean, standard frontend Anime schema
 */
export function mapJikanToAnime(data: any): Anime {
  const anime: Anime = {
    mal_id: data.mal_id,
    title: data.title || 'Unknown Title',
    english_title: data.title_english || data.title || 'Unknown Title',
    native_title: data.title_japanese || undefined,
    synonyms: data.title_synonyms || [],
    genres: data.genres?.map((g: any) => g.name) || [],
    synopsis: data.synopsis || 'No synopsis available.',
    score: data.score || 0,
    popularity: data.popularity || 99999,
    type: data.type || 'TV',
    episodes: data.episodes || 0,
    status: data.status || 'Finished Airing',
    year: data.year || data.aired?.prop?.from?.year || 0,
    studio: data.studios?.[0]?.name || 'Unknown Studio',
    image: data.images?.jpg?.large_image_url || data.images?.jpg?.image_url || '',
    format: data.type || 'TV',
    season: data.season ? data.season.toUpperCase() : undefined,
    source: data.source || undefined,
    duration: data.duration || undefined,
    rating: data.rating || undefined,
    bannerImage: undefined,
    trailer: data.trailer?.youtube_id ? {
      id: data.trailer.youtube_id,
      site: 'youtube',
      embedUrl: data.trailer.embed_url || `https://www.youtube.com/embed/${data.trailer.youtube_id}`
    } : null
  };

  globalAnimePool.set(anime.mal_id, anime);
  return anime;
}

function isMissingDetails(a: Anime): boolean {
  const isUnknown = (val: string | undefined | null) => {
    if (!val) return true;
    const l = val.toLowerCase().trim();
    return l === 'unknown' || l === 'unknown studio' || l === 'n/a' || l === 'no synopsis available.' || l === 'no description available.';
  };

  return !a.title || isUnknown(a.title) || !a.image || !a.synopsis || isUnknown(a.synopsis);
}

export function mergeAnime(a: Anime, b: Anime): Anime {
  const isUnknown = (val: string | undefined | null) => {
    if (!val) return true;
    const l = val.toLowerCase().trim();
    return l === 'unknown' || l === 'unknown studio' || l === 'n/a' || l === 'no synopsis available.' || l === 'no description available.';
  };

  return {
    mal_id: a.mal_id || b.mal_id,
    title: isUnknown(a.title) ? (b.title || 'Unknown Title') : a.title,
    english_title: isUnknown(a.english_title) ? (b.english_title || 'Unknown Title') : a.english_title,
    genres: (a.genres && a.genres.length > 0) ? a.genres : (b.genres || []),
    synopsis: (isUnknown(a.synopsis) || a.synopsis === 'No synopsis available.') ? (b.synopsis || 'No synopsis available.') : a.synopsis,
    score: (a.score && a.score > 0) ? a.score : (b.score || 0),
    popularity: (a.popularity && a.popularity < 99999) ? a.popularity : (b.popularity || 99999),
    type: isUnknown(a.type) ? (b.type || 'TV') : a.type,
    episodes: (a.episodes && a.episodes > 0) ? a.episodes : (b.episodes || 0),
    status: isUnknown(a.status) ? (b.status || 'Finished') : a.status,
    year: (a.year && a.year > 0) ? a.year : (b.year || 0),
    studio: isUnknown(a.studio) ? (b.studio || 'Unknown Studio') : a.studio,
    image: !a.image ? (b.image || '') : a.image,
    format: isUnknown(a.format) ? (b.format || 'TV') : a.format,
    season: isUnknown(a.season) ? (b.season || undefined) : a.season,
    source: a.source || b.source,
    duration: a.duration || b.duration,
    rating: a.rating || b.rating,
    bannerImage: a.bannerImage || b.bannerImage,
    trailer: a.trailer || b.trailer,
    characters: (a.characters && a.characters.length > 0) ? a.characters : (b.characters || []),
    relations: (a.relations && a.relations.length > 0) ? a.relations : (b.relations || []),
  };
}

/**
 * Fetch a list of popular anime from AniList to pre-populate our recommendation pool
 */
export async function seedGlobalAnimePool(): Promise<void> {
  console.log('[AnimePool] Pre-populating global pool with top 100 popular anime...');
  try {
    const query = `
      query {
        Page (page: 1, perPage: 100) {
          media (sort: [POPULARITY_DESC], type: ANIME) {
            id
            idMal
            title {
              romaji
              english
              native
            }
            coverImage {
              extraLarge
              large
            }
            bannerImage
            description
            genres
            episodes
            status
            seasonYear
            averageScore
            popularity
            studios(isMain: true) {
              nodes {
                name
              }
            }
            type
            format
            season
          }
        }
      }
    `;

    const res = await fetchWithRetry('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (res.ok) {
      const result = await res.json();
      const list = result.data?.Page?.media || [];
      list.forEach((media: any) => {
        mapAniListMediaToAnime(media);
      });
      console.log(`[AnimePool] Successfully populated ${globalAnimePool.size} unique titles into the dynamic pool.`);
    } else {
      console.warn('[AnimePool] AniList seeding returned non-200 status. Trying Jikan fallback...');
      await seedGlobalAnimePoolJikan();
    }
  } catch (err: any) {
    console.error('[AnimePool] Failed seeding from AniList:', err.message);
    await seedGlobalAnimePoolJikan();
  }
}

/**
 * Seeding fallback using Jikan
 */
async function seedGlobalAnimePoolJikan(): Promise<void> {
  try {
    const res = await fetchWithRetry('https://api.jikan.moe/v4/top/anime?limit=25', { method: 'GET' });
    if (res.ok) {
      const result = await res.json();
      const list = result.data || [];
      list.forEach((item: any) => {
        mapJikanToAnime(item);
      });
      console.log(`[AnimePool] Successfully populated ${globalAnimePool.size} titles via Jikan fallback.`);
    }
  } catch (err: any) {
    console.error('[AnimePool] Failed seeding fallback Jikan:', err.message);
  }
}

/**
 * Escape special characters for RegExp
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculates a match score for an anime based on the search query.
 * Higher score means better priority.
 */
export function getAnimeSearchScore(anime: Anime, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const title = (anime.title || '').toLowerCase();
  const english = (anime.english_title || '').toLowerCase();
  const native = (anime.native_title || '').toLowerCase();
  const synonyms = (anime.synonyms || []).map(s => s.toLowerCase());

  // 1. Exact match
  if (title === q || english === q) {
    return 100000;
  }

  // 2. Starts-with matches
  if (title.startsWith(q)) {
    return 90000;
  }
  if (english.startsWith(q)) {
    return 80000;
  }
  if (native.startsWith(q)) {
    return 70000;
  }
  if (synonyms.some(s => s.startsWith(q))) {
    return 60000;
  }

  // 3. Word boundary matches
  const boundaryRegex = new RegExp(`\\b${escapeRegExp(q)}`, 'i');
  if (boundaryRegex.test(title)) {
    return 50000;
  }
  if (boundaryRegex.test(english)) {
    return 40000;
  }
  if (native && boundaryRegex.test(native)) {
    return 30000;
  }
  if (synonyms.some(s => boundaryRegex.test(s))) {
    return 20000;
  }

  // 4. Substring matches
  if (title.includes(q)) {
    return 1000;
  }
  if (english.includes(q)) {
    return 800;
  }
  if (native.includes(q)) {
    return 600;
  }
  if (synonyms.some(s => s.includes(q))) {
    return 400;
  }

  return 0;
}

/**
 * Ranks an array of Anime results based on search query matching score and popularity
 */
export function rankAnimeList(list: Anime[], query: string): Anime[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;

  return [...list].sort((a, b) => {
    const scoreA = getAnimeSearchScore(a, q);
    const scoreB = getAnimeSearchScore(b, q);
    
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    
    // Tie-breaker 1: rating score (average score out of 10)
    const rateA = a.score || 0;
    const rateB = b.score || 0;
    if (Math.abs(rateB - rateA) > 0.01) {
      return rateB - rateA;
    }

    // Tie-breaker 2: popularity
    // Lower is better if MAL rank (e.g. 1 to 15000)
    // Higher is better if AniList member count (e.g. > 15000)
    const popA = a.popularity || 999999;
    const popB = b.popularity || 999999;
    
    const normPopA = popA < 15000 ? (15000 - popA) * 100 : popA;
    const normPopB = popB < 15000 ? (15000 - popB) * 100 : popB;
    
    if (normPopB !== normPopA) {
      return normPopB - normPopA;
    }

    // Tie-breaker 3: release year (newer first)
    return (b.year || 0) - (a.year || 0);
  });
}

/**
 * Searches the entire online AniList catalog, falling back to Jikan
 */
export async function searchOnlineAnime(
  search: string,
  genres: string[],
  type: string,
  minScore: number,
  sortBy: string,
  limit: number,
  offset: number
): Promise<{ total: number; data: Anime[]; genres: string[] }> {
  // Generate a strict cache key
  const cacheKey = JSON.stringify({ search, genres, type, minScore, sortBy, limit, offset });
  const cached = cache.search.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiry > now) {
    return cached.data;
  }

  try {
    // Standard page index calculations
    const page = Math.floor(offset / limit) + 1;
    const perPage = Math.min(limit, 50); // Cap perPage to 50 to comply with AniList GraphQL limits

    // Calculate current season for 'Seasonal Hits'
    let seasonVal: string | undefined = undefined;
    let seasonYearVal: number | undefined = undefined;

    // AniList sorting map
    let sortVal = 'POPULARITY_DESC';
    if (sortBy === 'popularity') {
      sortVal = 'TRENDING_DESC';
    } else if (sortBy === 'score') {
      sortVal = 'SCORE_DESC';
    } else if (sortBy === 'year') {
      sortVal = 'POPULARITY_DESC'; // Sort seasonal hits by popularity
      // Determine current season dynamically
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth(); // 0-11
      seasonYearVal = currentYear;
      if (currentMonth >= 0 && currentMonth <= 2) {
        seasonVal = 'WINTER';
      } else if (currentMonth >= 3 && currentMonth <= 5) {
        seasonVal = 'SPRING';
      } else if (currentMonth >= 6 && currentMonth <= 8) {
        seasonVal = 'SUMMER';
      } else {
        seasonVal = 'FALL';
      }
    } else if (sortBy === 'title') {
      sortVal = 'TITLE_ROMAJI';
    }

    // AniList format map
    let formatVal: string | undefined = undefined;
    if (type && type !== 'All') {
      const t = type.toUpperCase();
      if (t === 'TV' || t === 'MOVIE' || t === 'OVA' || t === 'ONA' || t === 'SPECIAL') {
        formatVal = t;
      }
    }

    const normalizedGenres = genres.length > 0 ? genres.map(normalizeGenreForAniList) : undefined;

    const query = `
      query ($search: String, $genres: [String], $format: MediaFormat, $sort: [MediaSort], $page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
        Page (page: $page, perPage: $perPage) {
          pageInfo {
            total
            perPage
            currentPage
            lastPage
            hasNextPage
          }
          media (search: $search, genre_in: $genres, format: $format, sort: $sort, type: ANIME, season: $season, seasonYear: $seasonYear) {
            id
            idMal
            title {
              romaji
              english
              native
            }
            synonyms
            coverImage {
              extraLarge
              large
              medium
            }
            bannerImage
            description
            genres
            episodes
            status
            seasonYear
            averageScore
            popularity
            studios(isMain: true) {
              nodes {
                name
              }
            }
            type
            format
            season
            source
            duration
            isAdult
          }
        }
      }
    `;

    const variables: any = {
      page,
      perPage,
      sort: [sortVal]
    };

    if (seasonVal) {
      variables.season = seasonVal;
    }
    if (seasonYearVal) {
      variables.seasonYear = seasonYearVal;
    }

    if (search && search.trim() !== '') {
      variables.search = search.trim();
    }
    if (normalizedGenres && normalizedGenres.length > 0) {
      variables.genres = normalizedGenres;
    }
    if (formatVal) {
      variables.format = formatVal;
    }

    const res = await fetchWithRetry('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    if (res.ok) {
      const result = await res.json();
      const mediaList = result.data?.Page?.media || [];
      const total = result.data?.Page?.pageInfo?.total || mediaList.length;

      let data = mediaList.map((media: any) => mapAniListMediaToAnime(media));

      // Post-filter by minimum score since AniList doesn't support a direct score filter inside main parameters
      if (minScore > 0) {
        data = data.filter((a: Anime) => a.score >= minScore);
      }

      // Automatically fall back/supplement with Jikan if AniList results are sparse
      if (data.length < 4 && search && search.trim() !== '') {
        console.warn('[Search] AniList returned too few results. Supplementing with Jikan...');
        try {
          const jikanRes = await searchOnlineAnimeJikan(search, genres, type, minScore, sortBy, limit, offset);
          if (jikanRes && jikanRes.data && jikanRes.data.length > 0) {
            const existingIds = new Set(data.map((a: Anime) => a.mal_id));
            jikanRes.data.forEach((jAnime: Anime) => {
              if (!existingIds.has(jAnime.mal_id)) {
                data.push(jAnime);
                existingIds.add(jAnime.mal_id);
              }
            });
          }
        } catch (jErr: any) {
          console.error('[Search] Jikan supplemental search failed:', jErr.message);
        }
      }
      
      // Merge with local matches and rank results if a search term exists
      if (search && search.trim() !== '') {
        const mergedMap = new Map<number, Anime>();
        const q = search.trim();

        // 1. Find matches in local database
        const localMatches = (localAnimeData as any[]).map(item => ({
          ...item,
          synonyms: item.synonyms || []
        }) as Anime).filter(anime => getAnimeSearchScore(anime, q) > 0);

        // 2. Put local matches first, then api data, to deduplicate by mal_id
        localMatches.forEach(anime => mergedMap.set(anime.mal_id, anime));
        data.forEach(anime => mergedMap.set(anime.mal_id, anime));

        // 3. Rank the entire merged list with our premium ranker
        data = rankAnimeList(Array.from(mergedMap.values()), q);
      }

      const output = {
        total: Math.max(total, data.length),
        data,
        genres: DEFAULT_GENRES,
      };

      // Cache search for 10 minutes (600,000 ms)
      cache.search.set(cacheKey, { data: output, expiry: now + 600000 });
      return output;
    } else {
      console.warn('[Search] AniList search returned error. Falling back to Jikan...');
      return await searchOnlineAnimeJikan(search, genres, type, minScore, sortBy, limit, offset);
    }
  } catch (err: any) {
    console.error('[Search] AniList search failed:', err.message);
    return await searchOnlineAnimeJikan(search, genres, type, minScore, sortBy, limit, offset);
  }
}

/**
 * Jikan search fallback
 */
async function searchOnlineAnimeJikan(
  search: string,
  genres: string[],
  type: string,
  minScore: number,
  sortBy: string,
  limit: number,
  offset: number
): Promise<{ total: number; data: Anime[]; genres: string[] }> {
  try {
    const page = Math.floor(offset / limit) + 1;
    let url = `https://api.jikan.moe/v4/anime?limit=${limit}&page=${page}`;

    if (sortBy === 'year' && (!search || search.trim() === '')) {
      url = `https://api.jikan.moe/v4/seasons/now?limit=${limit}&page=${page}`;
    } else if (sortBy === 'popularity' && (!search || search.trim() === '')) {
      url = `https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=${limit}&page=${page}`;
    } else if (sortBy === 'score' && (!search || search.trim() === '')) {
      url = `https://api.jikan.moe/v4/top/anime?limit=${limit}&page=${page}`;
    } else {
      if (search && search.trim() !== '') {
        url += `&q=${encodeURIComponent(search.trim())}`;
      }
      if (type && type !== 'All') {
        url += `&type=${type.toLowerCase()}`;
      }
      if (minScore > 0) {
        url += `&min_score=${minScore}`;
      }

      // Sort order
      if (sortBy === 'score') {
        url += `&order_by=score&sort=desc`;
      } else if (sortBy === 'title') {
        url += `&order_by=title&sort=asc`;
      } else {
        url += `&order_by=popularity&sort=asc`;
      }
    }

    const res = await fetchWithRetry(url, { method: 'GET' });
    if (res.ok) {
      const result = await res.json();
      const list = result.data || [];
      const total = result.pagination?.items?.total || list.length;
      let data = list.map((item: any) => mapJikanToAnime(item));

      // Merge with local matches and rank results if a search term exists
      if (search && search.trim() !== '') {
        const mergedMap = new Map<number, Anime>();
        const q = search.trim();

        // 1. Find matches in local database
        const localMatches = (localAnimeData as any[]).map(item => ({
          ...item,
          synonyms: item.synonyms || []
        }) as Anime).filter(anime => getAnimeSearchScore(anime, q) > 0);

        // 2. Put local matches first, then api data, to deduplicate by mal_id
        localMatches.forEach(anime => mergedMap.set(anime.mal_id, anime));
        data.forEach(anime => mergedMap.set(anime.mal_id, anime));

        // 3. Rank the entire merged list with our premium ranker
        data = rankAnimeList(Array.from(mergedMap.values()), q);
      }

      return {
        total: Math.max(total, data.length),
        data,
        genres: DEFAULT_GENRES,
      };
    }
  } catch (err: any) {
    console.error('[Search Fallback] Jikan search failed:', err.message);
  }

  // Fallback to pool search if offline completely
  console.warn('[Search Fallback] Completely offline. Searching in loaded pool...');
  let localList = Array.from(globalAnimePool.values());
  if (search && search.trim() !== '') {
    const q = search.trim();
    localList = localList.filter(a => getAnimeSearchScore(a, q) > 0);
    localList = rankAnimeList(localList, q);
  }
  return {
    total: localList.length,
    data: localList.slice(offset, offset + limit),
    genres: DEFAULT_GENRES
  };
}

/**
 * Dynamic full metadata loader for a single anime
 */
export async function getOnlineAnimeDetails(id: number): Promise<Anime> {
  const cached = cache.details.get(id);
  const now = Date.now();

  if (cached && cached.expiry > now) {
    return cached.data;
  }

  try {
    // Look up via AniList using both MalID and AniList ID support
    const query = `
      query ($id: Int, $idMal: Int) {
        Media (id: $id, idMal: $idMal, type: ANIME) {
          id
          idMal
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
            large
            medium
          }
          bannerImage
          description
          genres
          episodes
          status
          seasonYear
          averageScore
          popularity
          studios(isMain: true) {
            nodes {
              name
            }
          }
          type
          format
          season
          source
          duration
          isAdult
          trailer {
            id
            site
          }
          relations {
            edges {
              relationType
              node {
                id
                idMal
                title {
                  english
                  romaji
                }
                type
                coverImage {
                  large
                }
              }
            }
          }
          characters (sort: [ROLE, RELEVANCE, ID], perPage: 12) {
            edges {
              role
              node {
                id
                name {
                  full
                }
                image {
                  large
                }
              }
              voiceActors (language: JAPANESE) {
                id
                name {
                  full
                }
                image {
                  large
                }
              }
            }
          }
          recommendations (sort: [RATING_DESC, ID], perPage: 8) {
            edges {
              node {
                mediaRecommendation {
                  id
                  idMal
                  title {
                    english
                    romaji
                  }
                  type
                  coverImage {
                    large
                  }
                  description
                  genres
                  averageScore
                  popularity
                  seasonYear
                  studios(isMain: true) {
                    nodes {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    // Query on idMal first, with fallback to id
    const res = await fetchWithRetry('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { idMal: id } }),
    });

    let mediaData: any = null;

    if (res.ok) {
      const result = await res.json();
      mediaData = result.data?.Media;
    } else {
      // If MAL ID search fails, try searching by AniList ID directly (just in case they match)
      const resAlt = await fetchWithRetry('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query, variables: { id: id } }),
      });
      if (resAlt.ok) {
        const resultAlt = await resAlt.json();
        mediaData = resultAlt.data?.Media;
      }
    }

    if (mediaData) {
      let anime = mapAniListMediaToAnime(mediaData);
      
      // Also cache any recommendations returned by AniList so they are instantly accessible
      if (mediaData.recommendations?.edges) {
        const rawRecs = mediaData.recommendations.edges
          .map((edge: any) => edge.node?.mediaRecommendation)
          .filter(Boolean);
        
        const mappedRecs = rawRecs.map((r: any) => mapAniListMediaToAnime(r));
        cache.recommendations.set(id, { data: mappedRecs, expiry: now + 3600000 }); // Cache recommendations for 1 hour
      }

      // Automatically cross-reference Jikan if AniList is missing details to avoid empty fields/0.0 ratings
      if (isMissingDetails(anime)) {
        console.warn(`[Details Merge] AniList is missing key fields for ID ${id}. Merging with Jikan details...`);
        try {
          const jikanRes = await fetchWithRetry(`https://api.jikan.moe/v4/anime/${id}/full`, { method: 'GET' });
          if (jikanRes.ok) {
            const jikanData = await jikanRes.json();
            if (jikanData?.data) {
              const jikanAnime = mapJikanToAnime(jikanData.data);
              
              // Fetch characters for Jikan if AniList characters are missing
              if (!anime.characters || anime.characters.length === 0) {
                try {
                  const charRes = await fetchWithRetry(`https://api.jikan.moe/v4/anime/${id}/characters`, { method: 'GET' });
                  if (charRes.ok) {
                    const charResult = await charRes.json();
                    jikanAnime.characters = charResult.data?.slice(0, 12).map((c: any) => {
                      const va = c.voice_actors?.find((va: any) => va.language === 'Japanese');
                      return {
                        id: c.character.mal_id,
                        name: c.character.name,
                        role: c.role,
                        image: c.character.images?.jpg?.image_url || '',
                        voiceActor: va ? {
                          name: va.person.name,
                          image: va.person.images?.jpg?.image_url || '',
                        } : null
                      };
                    });
                  }
                } catch (charErr: any) {
                  console.error('[Details Merge] Jikan characters failed:', charErr.message);
                }
              }
              
              // Merge details
              anime = mergeAnime(anime, jikanAnime);
            }
          }
        } catch (jErr: any) {
          console.warn(`[Details Merge] Jikan fallback merge failed:`, jErr.message);
        }
      }

      // Cache details for 24 hours (86,400,000 ms)
      cache.details.set(id, { data: anime, expiry: now + 86400000 });
      return anime;
    } else {
      console.warn(`[Details] AniList details not found for ID ${id}. Using Jikan fallback...`);
      return await getOnlineAnimeDetailsJikan(id);
    }
  } catch (err: any) {
    console.error(`[Details] AniList details failed for ID ${id}:`, err.message);
    return await getOnlineAnimeDetailsJikan(id);
  }
}

/**
 * Jikan details fallback
 */
async function getOnlineAnimeDetailsJikan(id: number): Promise<Anime> {
  const now = Date.now();
  try {
    const res = await fetchWithRetry(`https://api.jikan.moe/v4/anime/${id}/full`, { method: 'GET' });
    if (res.ok) {
      const result = await res.json();
      const anime = mapJikanToAnime(result.data);

      // Fetch characters
      try {
        const charRes = await fetchWithRetry(`https://api.jikan.moe/v4/anime/${id}/characters`, { method: 'GET' });
        if (charRes.ok) {
          const charResult = await charRes.json();
          anime.characters = charResult.data?.slice(0, 12).map((c: any) => {
            const va = c.voice_actors?.find((va: any) => va.language === 'Japanese');
            return {
              id: c.character.mal_id,
              name: c.character.name,
              role: c.role,
              image: c.character.images?.jpg?.image_url || '',
              voiceActor: va ? {
                name: va.person.name,
                image: va.person.images?.jpg?.image_url || '',
              } : null
            };
          });
        }
      } catch (charErr: any) {
        console.error('[Details Fallback] Failed to fetch Jikan characters:', charErr.message);
      }

      cache.details.set(id, { data: anime, expiry: now + 86400000 });
      return anime;
    }
  } catch (err: any) {
    console.error(`[Details Fallback] Jikan details fallback completely failed for ID ${id}:`, err.message);
  }

  // Final emergency local lookup
  const local = globalAnimePool.get(id);
  if (local) return local;

  throw new Error(`Anime details completely unavailable for ID ${id}`);
}

/**
 * Fetches dynamic recommendations for a target anime
 */
export async function getOnlineRecommendations(id: number, limit = 8): Promise<Anime[]> {
  const cached = cache.recommendations.get(id);
  const now = Date.now();

  if (cached && cached.expiry > now) {
    return cached.data.slice(0, limit);
  }

  try {
    // If not cached, let's load details which populates recommendations automatically
    const details = await getOnlineAnimeDetails(id);
    const updatedCache = cache.recommendations.get(id);
    if (updatedCache) {
      return updatedCache.data.slice(0, limit);
    }
  } catch (err: any) {
    console.error('[Recommendations] Loader failed, trying Jikan recommendations fallback:', err.message);
  }

  // Fallback to Jikan recommendations
  try {
    const res = await fetchWithRetry(`https://api.jikan.moe/v4/anime/${id}/recommendations`, { method: 'GET' });
    if (res.ok) {
      const result = await res.json();
      const list = result.data || [];
      const mapped = list.slice(0, limit).map((r: any) => {
        const item = r.entry;
        return mapJikanToAnime(item);
      });
      cache.recommendations.set(id, { data: mapped, expiry: now + 3600000 });
      return mapped;
    }
  } catch (err: any) {
    console.error('[Recommendations Fallback] Jikan recommendations completely failed:', err.message);
  }

  // If all failed, return a random slice of our current global pool
  console.warn('[Recommendations Fallback] Complete recommendations blackout. Returning slice of globalPool...');
  return Array.from(globalAnimePool.values())
    .filter(a => a.mal_id !== id)
    .slice(0, limit);
}

/**
 * Dynamically loads and populates the pool with robust candidate matches
 */
export async function fetchDynamicRecommendationCandidates(id: number, sourceAnime: Anime): Promise<void> {
  const now = Date.now();
  
  // 1. Fetch direct AniList recommendations (up to 40)
  try {
    const query = `
      query ($idMal: Int) {
        Media (idMal: $idMal, type: ANIME) {
          recommendations (sort: [RATING_DESC, ID], perPage: 40) {
            edges {
              node {
                mediaRecommendation {
                  id
                  idMal
                  title {
                    english
                    romaji
                  }
                  type
                  format
                  season
                  coverImage {
                    large
                  }
                  description
                  genres
                  averageScore
                  popularity
                  seasonYear
                  studios(isMain: true) {
                    nodes {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    const res = await fetchWithRetry('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { idMal: id } }),
    });
    if (res.ok) {
      const result = await res.json();
      const rawRecs = result.data?.Media?.recommendations?.edges
        ?.map((edge: any) => edge.node?.mediaRecommendation)
        .filter(Boolean) || [];
      const mapped = rawRecs.map((r: any) => mapAniListMediaToAnime(r));
      // Save in recommendations cache
      cache.recommendations.set(id, { data: mapped, expiry: now + 3600000 });
    }
  } catch (err: any) {
    console.error('[Candidates] Failed to fetch direct AniList recommendations:', err.message);
  }

  // 2. Fetch Jikan recommendations as supplementary
  try {
    const res = await fetchWithRetry(`https://api.jikan.moe/v4/anime/${id}/recommendations`, { method: 'GET' });
    if (res.ok) {
      const result = await res.json();
      const list = result.data || [];
      list.slice(0, 30).forEach((r: any) => {
        if (r.entry) mapJikanToAnime(r.entry);
      });
    }
  } catch (err: any) {
    console.error('[Candidates] Failed to fetch Jikan recommendations:', err.message);
  }

  // 3. Fetch popular anime in same genres to enrich pool
  if (sourceAnime.genres && sourceAnime.genres.length > 0) {
    try {
      const genresToQuery = sourceAnime.genres.slice(0, 2);
      await searchOnlineAnime('', genresToQuery, 'All', 0, 'popularity', 30, 0);
    } catch (err) {
      console.error('[Candidates] Failed to fetch genre-matched candidates:', err);
    }
  }

  // 4. Fetch popular anime matching studio name
  if (sourceAnime.studio && sourceAnime.studio !== 'Unknown Studio' && sourceAnime.studio !== 'Unknown') {
    try {
      await searchOnlineAnime(sourceAnime.studio, [], 'All', 0, 'popularity', 15, 0);
    } catch (err) {
      console.error('[Candidates] Failed to fetch studio-matched candidates:', err);
    }
  }
}

/**
 * Searches the online AniList catalog for animation studios, with a local fallback
 */
export async function searchOnlineStudios(search: string): Promise<Array<{ id: number; name: string }>> {
  const cacheKey = `studio_search_${search.trim().toLowerCase()}`;
  const now = Date.now();
  
  if (cache.studios.has(cacheKey)) {
    const entry = cache.studios.get(cacheKey)!;
    if (entry.expiry > now) {
      return entry.data;
    }
  }

  const query = `
    query ($search: String) {
      Page (page: 1, perPage: 30) {
        studios (search: $search) {
          id
          name
        }
      }
    }
  `;

  try {
    const res = await fetchWithRetry('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { search: search.trim() || undefined }
      }),
    });

    if (res.ok) {
      const result = await res.json();
      const studiosList = result.data?.Page?.studios || [];
      const data = studiosList.map((s: any) => ({
        id: s.id,
        name: s.name
      }));
      cache.studios.set(cacheKey, { data, expiry: now + 600000 });
      return data;
    }
  } catch (err: any) {
    console.error('[Studio Search] AniList studio search failed:', err.message);
  }

  const popularStudios = [
    { id: 1, name: 'Kyoto Animation' },
    { id: 2, name: 'Madhouse' },
    { id: 3, name: 'MAPPA' },
    { id: 4, name: 'Bones' },
    { id: 5, name: 'A-1 Pictures' },
    { id: 6, name: 'Pierrot' },
    { id: 7, name: 'Sunrise' },
    { id: 8, name: 'CloverWorks' },
    { id: 9, name: 'WIT Studio' },
    { id: 10, name: 'Shaft' },
    { id: 11, name: 'Gainax' },
    { id: 12, name: 'ufotable' },
    { id: 13, name: 'Trigger' },
    { id: 14, name: 'Production I.G' },
    { id: 15, name: 'Science SARU' }
  ];

  const queryLower = search.toLowerCase().trim();
  const filtered = queryLower
    ? popularStudios.filter(s => s.name.toLowerCase().includes(queryLower))
    : popularStudios;

  return filtered;
}

export const BACKUP_GENRES_AND_TAGS = [
  'Action', 'Adventure', 'Avant Garde', 'Award Winning', 'Boys Love', 'Cars', 'CGDCT', 'Childcare', 
  'Combat Sports', 'Comedy', 'Crossdressing', 'Delinquents', 'Detective', 'Drama', 'Ecchi', 'Educational', 
  'Erotica', 'Fantasy', 'Gag Humor', 'Girls Love', 'Gore', 'Gourmet', 'Harem', 'High Stakes Game', 
  'Historical', 'Horror', 'Idols (Female)', 'Idols (Male)', 'Isekai', 'Iyashikei', 'Josei', 'Kids', 
  'Love Polygon', 'Magical Sex Shift', 'Mahou Shoujo', 'Martial Arts', 'Mecha', 'Medical', 'Military', 
  'Music', 'Mystery', 'Mythology', 'Organized Crime', 'Otaku Culture', 'Parody', 'Performing Arts', 
  'Pets', 'Psychological', 'Racing', 'Reincarnation', 'Reverse Harem', 'Romance', 'Samurai', 'School', 
  'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen', 'Showbiz', 'Slice of Life', 'Space', 'Sports', 'Strategy Game', 
  'Super Power', 'Supernatural', 'Survival', 'Suspense', 'Team Sports', 'Time Travel', 'Urban Fantasy', 
  'Vampire', 'Video Game', 'Visual Arts', 'Workplace', 'Adult Cast', 'Anthropomorphic', 'Villainess'
];

/**
 * Dynamically queries the complete AniList genre list and tags taxonomy, 
 * merging with a comprehensive fallback set to ensure zero missing tags.
 */
export async function fetchOnlineGenresAndTags(): Promise<string[]> {
  const cacheKey = 'anilist_genres_and_tags_v1';
  const now = Date.now();

  if (cache.genres.has(cacheKey)) {
    const entry = cache.genres.get(cacheKey)!;
    if (entry.expiry > now) {
      return entry.data;
    }
  }

  const query = `
    query {
      GenreCollection
      MediaTagCollection {
        name
        isAdult
      }
    }
  `;

  try {
    const res = await fetchWithRetry('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (res.ok) {
      const result = await res.json();
      const rawGenres: string[] = result.data?.GenreCollection || [];
      const rawTags: any[] = result.data?.MediaTagCollection || [];
      
      const tagNames = rawTags
        .filter(t => t && t.name)
        .map(t => t.name);

      const allCombined = new Set<string>();
      
      // Seed with backup list to guarantee user requested ones exist
      BACKUP_GENRES_AND_TAGS.forEach(g => allCombined.add(g));
      
      // Add live AniList genres & tags
      rawGenres.forEach(g => {
        if (g) allCombined.add(g);
      });
      tagNames.forEach(t => {
        if (t) allCombined.add(t);
      });

      const finalSorted = Array.from(allCombined).sort((a, b) => a.localeCompare(b));
      
      // Cache for 24 hours (86,400,000 ms)
      cache.genres.set(cacheKey, { data: finalSorted, expiry: now + 86400000 });
      return finalSorted;
    }
  } catch (err: any) {
    console.error('[Genres Fetch] Failed to query AniList genres collection:', err.message);
  }

  // Fallback to static alphabetically sorted list
  const fallback = [...BACKUP_GENRES_AND_TAGS].sort((a, b) => a.localeCompare(b));
  return fallback;
}
