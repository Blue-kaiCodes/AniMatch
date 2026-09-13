import { User, WatchListEntry, Anime } from '../types';

export interface CompatibilityResult {
  score: number;
  sharedFavorites: string[];
  sharedGenres: string[];
  bothWatching: string[];
  suggestedPrompt: string;
}

/**
 * Calculates a dynamic, authentic compatibility score between two users
 */
export function calculateCompatibility(
  userA: User,
  userB: User,
  watchlistA: WatchListEntry[] = [],
  watchlistB: WatchListEntry[] = []
): CompatibilityResult {
  // 1. Setup base match score (guaranteed baseline of 40%)
  let scorePoints = 40;
  
  // 2. Shared Genres Match
  const genresA = userA.favoriteGenres || [];
  const genresB = userB.favoriteGenres || [];
  const sharedGenres = genresA.filter(g => genresB.includes(g));
  scorePoints += sharedGenres.length * 7; // +7% per shared genre

  // 3. Shared Favorite Anime Match
  // We can look at completed anime or high rating anime as "favorites"
  const getFavorites = (wl: WatchListEntry[]) => 
    wl.filter(e => e.status === 'completed' || (e.userRating && e.userRating >= 8))
      .map(e => e.anime);
      
  const favsA = getFavorites(watchlistA);
  const favsB = getFavorites(watchlistB);
  
  const sharedFavorites: string[] = [];
  favsA.forEach(a => {
    const match = favsB.find(b => b.mal_id === a.mal_id);
    if (match) {
      sharedFavorites.push(match.english_title || match.title);
    }
  });
  scorePoints += sharedFavorites.length * 12; // +12% per shared high-rated/completed title

  // 4. Shared Studios
  const studiosA = userA.favoriteStudios || [];
  const studiosB = userB.favoriteStudios || [];
  const sharedStudios = studiosA.filter(s => studiosB.includes(s));
  scorePoints += sharedStudios.length * 5; // +5% per shared studio

  // 5. Watchlist Overlaps (What they are currently watching or plan to watch)
  const watchingA = watchlistA.filter(e => e.status === 'watching').map(e => e.anime);
  const watchingB = watchlistB.filter(e => e.status === 'watching').map(e => e.anime);
  
  const bothWatching: string[] = [];
  watchingA.forEach(a => {
    const match = watchingB.find(b => b.mal_id === a.mal_id);
    if (match) {
      bothWatching.push(match.english_title || match.title);
    }
  });
  scorePoints += bothWatching.length * 10; // +10% for watching same show simultaneously

  // 6. Rating correlation
  let ratingAgreements = 0;
  watchlistA.forEach(ea => {
    if (ea.userRating) {
      const eb = watchlistB.find(entry => entry.anime.mal_id === ea.anime.mal_id);
      if (eb?.userRating) {
        const diff = Math.abs(ea.userRating - eb.userRating);
        if (diff <= 1) {
          ratingAgreements += 1;
        } else if (diff <= 2) {
          ratingAgreements += 0.5;
        }
      }
    }
  });
  scorePoints += ratingAgreements * 4;

  // Clamp the score between 35% and 98% for realistic, satisfying results
  const finalScore = Math.max(35, Math.min(98, scorePoints));

  // 7. Dynamic Conversation Prompts based on shared context
  let suggestedPrompt = "Ask them about their favorite anime season!";
  if (bothWatching.length > 0) {
    suggestedPrompt = `Ask them what they thought about the latest episode of ${bothWatching[0]}!`;
  } else if (sharedFavorites.length > 0) {
    suggestedPrompt = `Discuss what you both loved about ${sharedFavorites[0]}!`;
  } else if (sharedGenres.length > 0) {
    suggestedPrompt = `Ask them for recommendations in the ${sharedGenres[0]} genre!`;
  } else if (sharedStudios.length > 0) {
    suggestedPrompt = `Talk about your shared love for ${sharedStudios[0]} studio works!`;
  }

  return {
    score: finalScore,
    sharedFavorites,
    sharedGenres,
    bothWatching,
    suggestedPrompt
  };
}
