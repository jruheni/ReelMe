/**
 * TypeScript Types and Interfaces
 * 
 * Defines the data structures for rooms, participants, movies, votes, and watchlists.
 */

// Movie data structure from TMDB API
export interface Movie {
  id: number; // TMDB ID
  title: string;
  poster_path: string | null; // Poster URL path
  release_date: string;
  vote_average: number; // TMDB rating (0-10)
  overview?: string;
  genre_ids?: number[]; // Genre IDs from TMDB
  backdrop_path?: string | null;
  runtime?: number; // Runtime in minutes
  original_language?: string;
  popularity?: number;
}

// Extended movie details with keywords from TMDB
export interface MovieDetails extends Movie {
  genres: { id: number; name: string }[];
  keywords?: {
    keywords: { id: number; name: string }[];
  };
  runtime: number;
  spoken_languages: { iso_639_1: string; name: string }[];
  vote_count: number;
}

// Seed movie for preference profile
export interface SeedMovie {
  id: number;
  title: string;
  poster_path: string | null;
  genre_ids: number[];
  keywords: string[];
  runtime: number;
  release_year: number;
  vote_average: number;
}

// User preference profile for recommendations
export interface PreferenceProfile {
  genreScores: { [genreId: number]: number }; // Weighted genre preferences
  keywords: string[]; // Common keywords from seed movies
  preferredRuntime: number; // Average runtime from seed movies
  preferredYearRange: [number, number]; // Min and max years
  minRating: number; // Minimum acceptable rating
}

// User preferences stored per participant
export interface UserPreferences {
  participantId: string;
  selectedGenres: number[]; // Explicitly selected genres
  seedMovies: SeedMovie[]; // 3 movies they already like
  profile?: PreferenceProfile; // Computed preference profile
  createdAt: string;
}

// Participant in a room
export interface Participant {
  id: string; // Unique participant ID (generated client-side)
  nickname: string;
  genres: number[]; // Selected genre IDs
  joinedAt: string; // ISO timestamp
  hasCompletedPreferences?: boolean; // Whether they've selected genres + seed movies
}

// Vote types for swiping
export type VoteType = 'liked' | 'maybe' | 'discarded';

// Votes structure: { participantId: { movieId: VoteType } }
export interface Votes {
  [participantId: string]: {
    [movieId: number]: VoteType;
  };
}

// Room document structure in Firestore
export interface Room {
  roomId: string; // Unique room code
  createdAt: string; // ISO timestamp
  participants: Participant[]; // Max 5 participants
  movieList: Movie[]; // Pre-ranked list of movies
  votes: Votes; // All participant votes
  watchlist: Movie[]; // Compiled watchlist (liked + maybe)
  preferences?: {
    genres: number[]; // Combined genres from all participants
    mood?: string;
    era?: string;
  };
  /**
   * Expected number of participants for this room.
   * Used to know when everyone has joined and is ready.
   */
  expectedParticipants?: number;
  /**
   * User preferences for each participant (for recommendation system)
   */
  userPreferences?: { [participantId: string]: UserPreferences };
  /**
   * Recommendation scores for movies (optional cache)
   */
  recommendationScores?: { [movieId: number]: number };
}

// TMDB API response structure
export interface TMDBResponse {
  results: Movie[];
  page: number;
  total_pages: number;
  total_results: number;
}

// TMDB Search response
export interface TMDBSearchResponse {
  results: Movie[];
  page: number;
  total_pages: number;
  total_results: number;
}

// Genre mapping (common TMDB genre IDs)
export const GENRES: { [key: number]: string } = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

