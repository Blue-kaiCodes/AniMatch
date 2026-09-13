import { useState, useEffect } from 'react';
import { Anime } from '../types';

// Global memory cache for anime metadata in the client session
const clientAnimeCache = new Map<number, Anime>();

/**
 * Normalizes strings by trimming and lowercasing to check for typical API placeholder values.
 */
export function isPlaceholder(val: string | undefined | null): boolean {
  if (!val) return true;
  const l = val.toLowerCase().trim();
  return (
    l === '' ||
    l === 'unknown' ||
    l === 'unknown studio' ||
    l === 'n/a' ||
    l === 'no synopsis available.' ||
    l === 'no description available.' ||
    l === 'null' ||
    l === 'undefined'
  );
}

/**
 * Checks if an anime's metadata is fully hydrated.
 * It is complete if it has valid non-placeholder fields.
 */
export function isAnimeComplete(anime: Anime | null | undefined): boolean {
  if (!anime) return false;

  // If these critical fields are missing or are placeholder values, we consider it incomplete
  const isMissing =
    !anime.score ||
    anime.score === 0 ||
    isPlaceholder(anime.studio) ||
    !anime.bannerImage ||
    isPlaceholder(anime.synopsis) ||
    !anime.year ||
    anime.year === 0 ||
    !anime.episodes ||
    !anime.season ||
    !anime.genres ||
    anime.genres.length === 0;

  return !isMissing;
}

/**
 * Stores or merges an anime into the client-side cache.
 */
export function cacheAnime(anime: Anime) {
  if (!anime || !anime.mal_id) return;
  const id = anime.mal_id;
  const existing = clientAnimeCache.get(id);

  if (existing) {
    // Merge properties, prioritizing non-placeholder values
    const merged: Anime = {
      ...existing,
      ...anime,
      title: !isPlaceholder(anime.title) ? anime.title : existing.title,
      english_title: !isPlaceholder(anime.english_title) ? anime.english_title : existing.english_title,
      native_title: !isPlaceholder(anime.native_title) ? anime.native_title : existing.native_title || anime.native_title,
      genres: anime.genres && anime.genres.length > 0 ? anime.genres : existing.genres,
      synopsis: !isPlaceholder(anime.synopsis) && anime.synopsis !== 'No synopsis available.' ? anime.synopsis : existing.synopsis,
      score: anime.score && anime.score > 0 ? anime.score : existing.score,
      popularity: anime.popularity && anime.popularity < 99999 ? anime.popularity : existing.popularity,
      type: !isPlaceholder(anime.type) ? anime.type : existing.type,
      episodes: anime.episodes && anime.episodes > 0 ? anime.episodes : existing.episodes,
      status: !isPlaceholder(anime.status) ? anime.status : existing.status,
      year: anime.year && anime.year > 0 ? anime.year : existing.year,
      studio: !isPlaceholder(anime.studio) ? anime.studio : existing.studio,
      image: anime.image || existing.image,
      format: anime.format || existing.format,
      season: anime.season || existing.season,
      bannerImage: anime.bannerImage || existing.bannerImage,
      trailer: anime.trailer || existing.trailer,
      characters: anime.characters && anime.characters.length > 0 ? anime.characters : existing.characters,
      relations: anime.relations && anime.relations.length > 0 ? anime.relations : existing.relations,
    };
    clientAnimeCache.set(id, merged);
  } else {
    clientAnimeCache.set(id, anime);
  }
}

/**
 * Retrieve cached anime by ID.
 */
export function getCachedAnime(id: number): Anime | undefined {
  return clientAnimeCache.get(id);
}

/**
 * React Hook to get fully hydrated anime metadata.
 * If the anime in cache or prop is not fully complete, it initiates an automatic enrichment request.
 */
export function useHydratedAnime(initialAnime: Anime | null | undefined) {
  const [anime, setAnime] = useState<Anime | null>(() => {
    if (!initialAnime || !initialAnime.mal_id) return null;
    const cached = clientAnimeCache.get(initialAnime.mal_id);
    if (cached && isAnimeComplete(cached)) {
      return cached;
    }
    return isAnimeComplete(initialAnime) ? initialAnime : null;
  });

  const [isHydrating, setIsHydrating] = useState(() => {
    if (!initialAnime || !initialAnime.mal_id) return false;
    const cached = clientAnimeCache.get(initialAnime.mal_id);
    if (cached && isAnimeComplete(cached)) {
      return false;
    }
    return !isAnimeComplete(initialAnime);
  });

  useEffect(() => {
    if (!initialAnime || !initialAnime.mal_id) {
      setAnime(null);
      setIsHydrating(false);
      return;
    }

    const id = initialAnime.mal_id;

    // Check cache first
    const cached = clientAnimeCache.get(id);
    if (cached && isAnimeComplete(cached)) {
      setAnime(cached);
      setIsHydrating(false);
      return;
    }

    // If initialAnime is complete, store and use it
    if (isAnimeComplete(initialAnime)) {
      cacheAnime(initialAnime);
      setAnime(initialAnime);
      setIsHydrating(false);
      return;
    }

    // Otherwise, perform metadata enrichment
    let isMounted = true;
    setIsHydrating(true);

    const enrich = async () => {
      try {
        const res = await fetch(`/api/anime/${id}`);
        if (res.ok) {
          const fullAnime = await res.json();
          if (isMounted) {
            cacheAnime(fullAnime);
            setAnime(fullAnime);
          }
        } else {
          // If enrichment fails, fallback to what we have
          if (isMounted) {
            cacheAnime(initialAnime);
            setAnime(initialAnime);
          }
        }
      } catch (err) {
        console.error(`[Hydration] Error enriching anime ID ${id}:`, err);
        if (isMounted) {
          cacheAnime(initialAnime);
          setAnime(initialAnime);
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    enrich();

    return () => {
      isMounted = false;
    };
  }, [initialAnime?.mal_id]);

  return { anime, isHydrating };
}
