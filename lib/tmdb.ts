/**
 * TMDB (The Movie Database) API Integration
 * 
 * Fetches movies from TMDB API based on selected genres.
 * Requires TMDB API key in environment variables.
 */

import axios from 'axios';
import { Movie, TMDBResponse } from '@/types';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Fetch movies from TMDB based on genres
 * 
 * @param genreIds - Array of TMDB genre IDs
 * @param page - Page number (default: 1)
 * @returns Promise with array of movies
 */
export async function fetchMoviesByGenres(
  genreIds: number[],
  page: number = 1
): Promise<Movie[]> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API key is not configured. Please set NEXT_PUBLIC_TMDB_API_KEY in your .env file.');
  }

  try {
    // Build genre query string (e.g., "28,12,35")
    const genreQuery = genreIds.join(',');

    // Fetch movies from TMDB Discover API
    const response = await axios.get<TMDBResponse>(`${TMDB_BASE_URL}/discover/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        with_genres: genreQuery,
        sort_by: 'popularity.desc', // Start with popular movies
        page: page,
        'vote_count.gte': 100, // Only include movies with at least 100 votes (quality filter)
        'vote_average.gte': 5.0, // Minimum rating of 5.0
      },
    });

    return response.data.results;
  } catch (error) {
    console.error('Error fetching movies from TMDB:', error);
    throw new Error('Failed to fetch movies from TMDB API');
  }
}

/**
 * Fetch multiple pages of movies and combine results
 * 
 * @param genreIds - Array of TMDB genre IDs
 * @param maxPages - Maximum number of pages to fetch (default: 3)
 * @returns Promise with combined array of movies
 */
export async function fetchMultiplePages(
  genreIds: number[],
  maxPages: number = 3
): Promise<Movie[]> {
  const allMovies: Movie[] = [];
  
  // Fetch multiple pages in parallel for better performance
  const promises = Array.from({ length: maxPages }, (_, i) =>
    fetchMoviesByGenres(genreIds, i + 1)
  );
  
  const results = await Promise.all(promises);
  results.forEach((movies) => {
    allMovies.push(...movies);
  });
  
  // Remove duplicates based on movie ID
  const uniqueMovies = Array.from(
    new Map(allMovies.map((movie) => [movie.id, movie])).values()
  );
  
  return uniqueMovies;
}

/**
 * Get genre name by ID
 */
export function getGenreName(genreId: number): string {
  const genreMap: { [key: number]: string } = {
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
  
  return genreMap[genreId] || 'Unknown';
}

