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
}

// Participant in a room
export interface Participant {
  id: string; // Unique participant ID (generated client-side)
  nickname: string;
  genres: number[]; // Selected genre IDs
  joinedAt: string; // ISO timestamp
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
}

// TMDB API response structure
export interface TMDBResponse {
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

