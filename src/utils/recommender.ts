export interface Anime {
  mal_id: number;
  title: string;
  english_title: string;
  native_title?: string;
  synonyms?: string[];
  genres: string[];
  synopsis: string;
  score: number;
  popularity: number;
  type: string;
  episodes: number;
  status: string;
  year: number;
  studio: string;
  image: string;
  format?: string;
  season?: string;
}

// Standard English stopwords to clean text and focus TF-IDF on meaningful keywords
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
  'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes',
  'her', 'here', 'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im',
  'ive', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my',
  'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt',
  'so', 'some', 'such', 'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'theres', 'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'werent', 'what',
  'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom', 'why', 'whys', 'with',
  'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves',
  'also', 'show', 'series', 'world', 'story', 'life', 'find', 'must', 'new', 'one', 'two', 'three', 'school',
  'high', 'power', 'special', 'group', 'join', 'together', 'become', 'begins', 'time', 'years'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // replace punctuation with spaces
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOPWORDS.has(word));
}

export class ContentRecommender {
  private animeList: Anime[];
  private idf: Map<string, number> = new Map();
  private tfidfVectors: Map<number, Map<string, number>> = new Map();
  private vocabulary: Set<string> = new Set();

  constructor(animeList: Anime[]) {
    this.animeList = animeList;
    this.buildIndex();
  }

  private buildIndex() {
    const docCount = this.animeList.length;
    const docTermFreqs: Map<number, Map<string, number>> = new Map();
    const docCounts: Map<string, number> = new Map();

    // Step 1: Compute term frequencies and document counts
    for (const anime of this.animeList) {
      const tokens: string[] = [];

      // Heavy weighting: Add genres 4 times to heavily influence similarity
      for (const genre of anime.genres) {
        const genreToken = `genre_${genre.toLowerCase().replace(/\s+/g, '_')}`;
        for (let i = 0; i < 4; i++) {
          tokens.push(genreToken);
        }
      }

      // Medium weighting: Add studio 2 times
      if (anime.studio && anime.studio !== 'Unknown Studio') {
        const studioToken = `studio_${anime.studio.toLowerCase().replace(/\s+/g, '_')}`;
        for (let i = 0; i < 2; i++) {
          tokens.push(studioToken);
        }
      }

      // Light weighting: Add type
      if (anime.type) {
        tokens.push(`type_${anime.type.toLowerCase()}`);
      }

      // Standard weighting: Tokenize synopsis
      if (anime.synopsis) {
        tokens.push(...tokenize(anime.synopsis));
      }

      // Compute TF for this anime
      const termCounts = new Map<string, number>();
      for (const token of tokens) {
        termCounts.set(token, (termCounts.get(token) || 0) + 1);
        this.vocabulary.add(token);
      }

      const totalTokens = tokens.length || 1;
      const tf = new Map<string, number>();
      for (const [term, count] of termCounts.entries()) {
        tf.set(term, count / totalTokens);
      }

      docTermFreqs.set(anime.mal_id, tf);

      // Increment document counts for IDF
      for (const term of termCounts.keys()) {
        docCounts.set(term, (docCounts.get(term) || 0) + 1);
      }
    }

    // Step 2: Compute IDF
    for (const [term, count] of docCounts.entries()) {
      const val = Math.log(1 + docCount / count);
      this.idf.set(term, val);
    }

    // Step 3: Compute TF-IDF Vectors
    for (const anime of this.animeList) {
      const tf = docTermFreqs.get(anime.mal_id) || new Map();
      const vector = new Map<string, number>();

      for (const [term, tfVal] of tf.entries()) {
        const idfVal = this.idf.get(term) || 0;
        vector.set(term, tfVal * idfVal);
      }

      this.tfidfVectors.set(anime.mal_id, vector);
    }
  }

  private cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    // We can iterate over the smaller vector for dot product
    for (const [term, valA] of vecA.entries()) {
      magnitudeA += valA * valA;
      const valB = vecB.get(term) || 0;
      dotProduct += valA * valB;
    }

    for (const valB of vecB.values()) {
      magnitudeB += valB * valB;
    }

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
  }

  /**
   * Recommends anime similar to the source anime
   * @param malId MyAnimeList ID of the source anime
   * @param limit Number of recommendations to return
   * @param directRecommendations Direct recommendations from AniList or Jikan
   * @returns List of recommended anime with similarity and final scores
   */
  public recommend(
    malId: number,
    limit: number = 40,
    directRecommendations: any[] = []
  ): (Anime & { similarity: number; finalScore: number })[] {
    const sourceVector = this.tfidfVectors.get(malId);
    const sourceAnime = this.animeList.find(a => a.mal_id === malId);

    if (!sourceAnime) {
      return [];
    }

    // If sourceVector is missing, construct a dummy empty vector for it
    const sVector = sourceVector || new Map<string, number>();

    const recommendations: (Anime & { similarity: number; finalScore: number })[] = [];

    const THEME_KEYWORDS = [
      'school', 'military', 'historical', 'superhero', 'space', 'music', 'mecha', 'isekai', 
      'cyberpunk', 'samurai', 'harem', 'survival', 'cooking', 'magic', 'vampire', 'ninja', 
      'police', 'detective', 'game', 'post-apocalyptic', 'time-travel', 'martial-arts',
      'sports', 'demons', 'supernatural', 'psychological', 'thriller', 'romance', 'comedy',
      'drama', 'action', 'adventure', 'fantasy', 'sci-fi'
    ];

    const getThemes = (a: Anime) => {
      const text = `${a.synopsis || ''} ${a.genres ? a.genres.join(' ') : ''}`.toLowerCase();
      return THEME_KEYWORDS.filter(theme => text.includes(theme));
    };

    const themesS = getThemes(sourceAnime);

    for (const targetAnime of this.animeList) {
      // Don't recommend the same anime
      if (targetAnime.mal_id === malId) continue;

      const targetVector = this.tfidfVectors.get(targetAnime.mal_id) || new Map<string, number>();

      // 1. Cosine & TF-IDF Similarity
      const cosSim = this.cosineSimilarity(sVector, targetVector);

      // 2. Genre Similarity (Jaccard Index)
      let genreSim = 0;
      if (sourceAnime.genres && targetAnime.genres) {
        const setS = new Set(sourceAnime.genres.map(g => g.toLowerCase()));
        const setT = new Set(targetAnime.genres.map(g => g.toLowerCase()));
        const intersection = new Set([...setS].filter(x => setT.has(x)));
        const union = new Set([...setS, ...setT]);
        genreSim = union.size > 0 ? intersection.size / union.size : 0;
      }

      // 3. Theme Similarity
      let themeSim = 0;
      const themesT = getThemes(targetAnime);
      if (themesS.length > 0 && themesT.length > 0) {
        const overlap = themesS.filter(t => themesT.includes(t)).length;
        themeSim = overlap / Math.max(themesS.length, 1);
      }

      // 4. Studio Similarity
      let studioSim = 0;
      if (
        sourceAnime.studio && targetAnime.studio &&
        sourceAnime.studio !== 'Unknown Studio' &&
        sourceAnime.studio !== 'Unknown' &&
        sourceAnime.studio === targetAnime.studio
      ) {
        studioSim = 1.0;
      }

      // 5. Direct AniList Recommendation Booster
      const isDirect = directRecommendations.some(r => r.mal_id === targetAnime.mal_id) ? 1.0 : 0.0;

      // Hybrid combination scoring
      // Weights sum to 1.0
      const wDirect = 0.35;
      const wTfidf = 0.25;
      const wGenre = 0.20;
      const wTheme = 0.15;
      const wStudio = 0.05;

      let finalScore = (isDirect * wDirect) +
                       (cosSim * wTfidf) +
                       (genreSim * wGenre) +
                       (themeSim * wTheme) +
                       (studioSim * wStudio);

      // Score rating and popularity booster (minor refinements for extreme high quality)
      const scoreBooster = 1 + ((targetAnime.score || 0) / 10) * 0.05;
      const popularityBooster = (targetAnime.popularity && targetAnime.popularity <= 150) ? 1.03 : 1.0;
      finalScore = finalScore * scoreBooster * popularityBooster;

      // Map to a human friendly similarity score (e.g. 72% to 98%)
      // Ensure if it's a very good recommendation, it has a high percentage.
      // If it's direct, give it a base floor of 80.
      let similarityPercent = Math.round(finalScore * 100);
      if (isDirect === 1.0) {
        similarityPercent = Math.max(similarityPercent, Math.round(80 + cosSim * 15 + genreSim * 5));
      } else {
        similarityPercent = Math.max(similarityPercent, Math.round(45 + cosSim * 30 + genreSim * 15));
      }
      similarityPercent = Math.min(similarityPercent, 99); // Cap at 99% to keep realistic

      recommendations.push({
        ...targetAnime,
        similarity: similarityPercent,
        finalScore
      });
    }

    // Sort by finalScore descending
    return recommendations
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit);
  }
}
