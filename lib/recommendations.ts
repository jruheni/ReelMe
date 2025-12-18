/**
 * Recommendation Engine
 * 
 * Content-based recommendation system using seed movies and genre preferences.
 * Generates ranked movie recommendations for room participants.
 */

import { 
  Movie, 
  SeedMovie, 
  PreferenceProfile, 
  UserPreferences,
  MovieDetails 
} from '@/types';
import { fetchMovieDetails, discoverMovies } from './tmdb';

/**
 * Build a preference profile from seed movies and selected genres
 * 
 * @param seedMovies - Array of 3 seed movies with details
 * @param selectedGenres - Explicitly selected genre IDs
 * @returns Computed preference profile
 */
export function buildPreferenceProfile(
  seedMovies: SeedMovie[],
  selectedGenres: number[]
): PreferenceProfile {
  // Initialize genre scores
  const genreScores: { [genreId: number]: number } = {};

  // High weight for explicitly selected genres
  selectedGenres.forEach((genreId) => {
    genreScores[genreId] = 10;
  });

  // Medium weight for genres in seed movies
  seedMovies.forEach((movie) => {
    movie.genre_ids.forEach((genreId) => {
      if (genreScores[genreId]) {
        genreScores[genreId] += 3; // Boost if already selected
      } else {
        genreScores[genreId] = 5; // Medium weight
      }
    });
  });

  // Extract common keywords
  const keywordCounts: { [keyword: string]: number } = {};
  seedMovies.forEach((movie) => {
    movie.keywords.forEach((keyword) => {
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
    });
  });

  // Keep keywords that appear in at least 2 movies
  const commonKeywords = Object.entries(keywordCounts)
    .filter(([_, count]) => count >= 2)
    .map(([keyword]) => keyword);

  // Calculate preferred runtime (average)
  const totalRuntime = seedMovies.reduce((sum, m) => sum + m.runtime, 0);
  const preferredRuntime = Math.round(totalRuntime / seedMovies.length);

  // Calculate year range
  const years = seedMovies.map((m) => m.release_year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const yearRange: [number, number] = [
    Math.max(minYear - 5, 1980), // Extend range by 5 years back
    Math.min(maxYear + 3, new Date().getFullYear() + 1), // Extend 3 years forward
  ];

  // Calculate minimum acceptable rating
  const avgRating = seedMovies.reduce((sum, m) => sum + m.vote_average, 0) / seedMovies.length;
  const minRating = Math.max(avgRating - 1.5, 6.0); // Allow 1.5 points lower, but min 6.0

  return {
    genreScores,
    keywords: commonKeywords,
    preferredRuntime,
    preferredYearRange: yearRange,
    minRating,
  };
}

/**
 * Fetch and enrich seed movies with details and keywords
 * 
 * @param movieIds - Array of TMDB movie IDs
 * @returns Promise with array of enriched seed movies
 */
export async function fetchSeedMovies(movieIds: number[]): Promise<SeedMovie[]> {
  const seedMovies: SeedMovie[] = [];

  for (const movieId of movieIds) {
    try {
      const details = await fetchMovieDetails(movieId);
      
      const seedMovie: SeedMovie = {
        id: details.id,
        title: details.title,
        poster_path: details.poster_path,
        genre_ids: details.genres.map((g) => g.id),
        keywords: details.keywords?.keywords.map((k) => k.name) || [],
        runtime: details.runtime || 120,
        release_year: new Date(details.release_date).getFullYear(),
        vote_average: details.vote_average,
      };

      seedMovies.push(seedMovie);
    } catch (error) {
      console.error(`Failed to fetch seed movie ${movieId}:`, error);
    }
  }

  return seedMovies;
}

/**
 * Fetch candidate movies for recommendations
 * 
 * @param profile - User preference profile
 * @param maxMovies - Maximum number of movies to fetch (default: 200)
 * @returns Promise with array of candidate movies
 */
export async function fetchCandidateMovies(
  profile: PreferenceProfile,
  maxMovies: number = 200
): Promise<Movie[]> {
  const candidates: Movie[] = [];
  const topGenres = Object.entries(profile.genreScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([genreId]) => Number(genreId));

  const moviesPerPage = 20;
  const pagesToFetch = Math.ceil(maxMovies / moviesPerPage);

  // Fetch multiple pages in parallel
  const promises = Array.from({ length: Math.min(pagesToFetch, 10) }, (_, i) =>
    discoverMovies({
      genreIds: topGenres,
      minVoteCount: 300,
      minVoteAverage: profile.minRating,
      minYear: profile.preferredYearRange[0],
      maxYear: profile.preferredYearRange[1],
      page: i + 1,
    })
  );

  const results = await Promise.all(promises);
  results.forEach((movies) => {
    candidates.push(...movies);
  });

  // Remove duplicates
  const uniqueCandidates = Array.from(
    new Map(candidates.map((movie) => [movie.id, movie])).values()
  );

  return uniqueCandidates.slice(0, maxMovies);
}

/**
 * Score a single movie based on preference profile
 * 
 * @param movie - Movie to score
 * @param profile - User preference profile
 * @returns Recommendation score (higher is better)
 */
export function scoreMovie(movie: Movie, profile: PreferenceProfile): number {
  let score = 0;

  // 1. Genre match (weighted by genre scores) - up to 30 points
  if (movie.genre_ids) {
    const genreScore = movie.genre_ids.reduce((sum, genreId) => {
      return sum + (profile.genreScores[genreId] || 0);
    }, 0);
    score += Math.min(genreScore, 30);
  }

  // 2. Runtime similarity - up to 10 points
  if (movie.runtime) {
    const runtimeDiff = Math.abs(movie.runtime - profile.preferredRuntime);
    const runtimeScore = Math.max(10 - runtimeDiff / 10, 0);
    score += runtimeScore;
  }

  // 3. Release year proximity - up to 10 points
  const movieYear = new Date(movie.release_date).getFullYear();
  const [minYear, maxYear] = profile.preferredYearRange;
  const midYear = (minYear + maxYear) / 2;
  const yearDiff = Math.abs(movieYear - midYear);
  const yearScore = Math.max(10 - yearDiff / 5, 0);
  score += yearScore;

  // 4. Rating bonus - up to 10 points
  const ratingBonus = (movie.vote_average - profile.minRating) * 2;
  score += Math.min(Math.max(ratingBonus, 0), 10);

  // 5. Popularity bonus (minor) - up to 5 points
  if (movie.popularity) {
    const popularityScore = Math.min(movie.popularity / 100, 5);
    score += popularityScore;
  }

  return score;
}

/**
 * Generate ranked recommendations for a user
 * 
 * @param userPreferences - User preferences with seed movies and genres
 * @returns Promise with ranked array of recommended movies
 */
export async function generateRecommendations(
  userPreferences: UserPreferences
): Promise<Movie[]> {
  // Build preference profile if not already computed
  let profile = userPreferences.profile;
  if (!profile) {
    profile = buildPreferenceProfile(
      userPreferences.seedMovies,
      userPreferences.selectedGenres
    );
  }

  // Fetch candidate movies
  const candidates = await fetchCandidateMovies(profile);

  // Score and rank candidates
  const scoredMovies = candidates.map((movie) => ({
    movie,
    score: scoreMovie(movie, profile),
  }));

  // Sort by score descending
  scoredMovies.sort((a, b) => b.score - a.score);

  // Return top movies
  return scoredMovies.map((item) => item.movie);
}

/**
 * Aggregate recommendations from multiple participants
 * Combines individual preference profiles for group recommendations
 * 
 * @param allUserPreferences - Array of all participants' preferences
 * @returns Promise with ranked array of group recommendations
 */
export async function generateGroupRecommendations(
  allUserPreferences: UserPreferences[]
): Promise<{ movies: Movie[]; scores: { [movieId: number]: number } }> {
  // Build individual profiles
  const profiles = allUserPreferences.map((prefs) =>
    prefs.profile || buildPreferenceProfile(prefs.seedMovies, prefs.selectedGenres)
  );

  // Aggregate genre scores
  const aggregatedGenreScores: { [genreId: number]: number } = {};
  profiles.forEach((profile) => {
    Object.entries(profile.genreScores).forEach(([genreId, score]) => {
      const id = Number(genreId);
      aggregatedGenreScores[id] = (aggregatedGenreScores[id] || 0) + score;
    });
  });

  // Average the scores
  Object.keys(aggregatedGenreScores).forEach((genreId) => {
    aggregatedGenreScores[Number(genreId)] /= profiles.length;
  });

  // Aggregate keywords (keep if mentioned by at least 50% of users)
  const keywordCounts: { [keyword: string]: number } = {};
  profiles.forEach((profile) => {
    profile.keywords.forEach((keyword) => {
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
    });
  });
  const threshold = Math.ceil(profiles.length / 2);
  const aggregatedKeywords = Object.entries(keywordCounts)
    .filter(([, count]) => count >= threshold)
    .map(([keyword]) => keyword);

  // Average runtime and year range
  const avgRuntime = Math.round(
    profiles.reduce((sum, p) => sum + p.preferredRuntime, 0) / profiles.length
  );
  const allMinYears = profiles.map((p) => p.preferredYearRange[0]);
  const allMaxYears = profiles.map((p) => p.preferredYearRange[1]);
  const yearRange: [number, number] = [
    Math.min(...allMinYears),
    Math.max(...allMaxYears),
  ];
  const avgMinRating =
    profiles.reduce((sum, p) => sum + p.minRating, 0) / profiles.length;

  // Create aggregated profile
  const aggregatedProfile: PreferenceProfile = {
    genreScores: aggregatedGenreScores,
    keywords: aggregatedKeywords,
    preferredRuntime: avgRuntime,
    preferredYearRange: yearRange,
    minRating: avgMinRating,
  };

  // Fetch candidates
  const candidates = await fetchCandidateMovies(aggregatedProfile, 300);

  // Score movies
  const scoredMovies = candidates.map((movie) => ({
    movie,
    score: scoreMovie(movie, aggregatedProfile),
  }));

  // Sort by score
  scoredMovies.sort((a, b) => b.score - a.score);

  // Build score map
  const scores: { [movieId: number]: number } = {};
  scoredMovies.forEach((item) => {
    scores[item.movie.id] = item.score;
  });

  return {
    movies: scoredMovies.map((item) => item.movie),
    scores,
  };
}
