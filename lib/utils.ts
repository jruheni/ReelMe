/**
 * Utility Functions
 * 
 * Helper functions for room code generation, watchlist compilation, etc.
 */

import { Room, Movie, VoteType } from '@/types';

/**
 * Generate a unique 6-character room code
 * Format: 3 letters + 3 numbers (e.g., "ABC123")
 */
export function generateRoomCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let code = '';
  // Add 3 random letters
  for (let i = 0; i < 3; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  // Add 3 random numbers
  for (let i = 0; i < 3; i++) {
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return code;
}

/**
 * Generate a unique participant ID
 */
export function generateParticipantId(): string {
  return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Compile watchlist from all participant votes
 * Merges "liked" and "maybe" votes, removes duplicates
 * 
 * @param room - Room document with votes and movieList
 * @returns Array of movies that are in the watchlist
 */
export function compileWatchlist(room: Room): Movie[] {
  const watchlistMovieIds = new Set<number>();
  
  // Collect all movie IDs that have "liked" or "maybe" votes
  Object.values(room.votes).forEach((participantVotes) => {
    Object.entries(participantVotes).forEach(([movieId, voteType]) => {
      if (voteType === 'liked' || voteType === 'maybe') {
        watchlistMovieIds.add(Number(movieId));
      }
    });
  });
  
  // Map movie IDs back to full movie objects from movieList
  const watchlist = room.movieList.filter((movie) =>
    watchlistMovieIds.has(movie.id)
  );
  
  // Remove duplicates (shouldn't happen, but safety check)
  const uniqueWatchlist = Array.from(
    new Map(watchlist.map((movie) => [movie.id, movie])).values()
  );
  
  return uniqueWatchlist;
}

/**
 * Rank movies based on critic score (rating), recency, and genre match
 * 
 * @param movies - Array of movies to rank
 * @param selectedGenres - Array of selected genre IDs
 * @returns Sorted array of movies (best matches first)
 */
export function rankMovies(movies: Movie[], selectedGenres: number[]): Movie[] {
  return [...movies].sort((a, b) => {
    // 1. TMDB rating (critic score) - higher is better
    if (a.vote_average !== b.vote_average) {
      return b.vote_average - a.vote_average;
    }
    
    // 2. Recency (newer movies first)
    const aYear = new Date(a.release_date).getFullYear();
    const bYear = new Date(b.release_date).getFullYear();
    if (aYear !== bYear) {
      return bYear - aYear;
    }

    // 3. Genre match score (as a softer tiebreaker)
    const aGenreMatch = a.genre_ids?.filter((id) => selectedGenres.includes(id)).length || 0;
    const bGenreMatch = b.genre_ids?.filter((id) => selectedGenres.includes(id)).length || 0;
    return bGenreMatch - aGenreMatch;
  });
}

/**
 * Get poster URL from TMDB path
 */
export function getPosterUrl(posterPath: string | null, size: 'w200' | 'w300' | 'w500' = 'w500'): string {
  if (!posterPath) {
    // Return a placeholder image URL (using a service like placeholder.com or a data URI)
    return `https://via.placeholder.com/500x750/1a1a2e/ffffff?text=No+Poster`;
  }
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

