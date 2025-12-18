/**
 * TMDB (The Movie Database) API Integration
 * 
 * Fetches movies from TMDB API based on selected genres.
 * Requires TMDB API key in environment variables.
 */

import axios from 'axios';
import { Movie, TMDBResponse, MovieDetails, TMDBSearchResponse } from '@/types';

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
    // Build genre query string
    // Use "|" so TMDB treats it as OR between genres (broader, less obscure set)
    const genreQuery = genreIds.join('|');

    // Fetch movies from TMDB Discover API
    const response = await axios.get<TMDBResponse>(`${TMDB_BASE_URL}/discover/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        with_genres: genreQuery,
        // Prioritise higher-rated movies
        sort_by: 'vote_average.desc',
        page: page,
        // Strong quality filters to avoid obscure titles
        'vote_count.gte': 500,
        'vote_average.gte': 7.0,
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
 * Fetch detailed movie information including keywords
 * 
 * @param movieId - TMDB movie ID
 * @returns Promise with detailed movie data including keywords
 */
export async function fetchMovieDetails(movieId: number): Promise<MovieDetails> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API key is not configured');
  }

  try {
    // Fetch movie details with keywords appended
    const response = await axios.get<MovieDetails>(
      `${TMDB_BASE_URL}/movie/${movieId}`,
      {
        params: {
          api_key: TMDB_API_KEY,
          append_to_response: 'keywords',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(`Error fetching details for movie ${movieId}:`, error);
    throw new Error('Failed to fetch movie details');
  }
}

/**
 * Search for movies by title (for seed movie selection)
 * 
 * @param query - Search query string
 * @param page - Page number (default: 1)
 * @returns Promise with array of movies matching the search
 */
export async function searchMovies(
  query: string,
  page: number = 1
): Promise<Movie[]> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API key is not configured');
  }

  if (!query.trim()) {
    return [];
  }

  try {
    const response = await axios.get<TMDBSearchResponse>(
      `${TMDB_BASE_URL}/search/movie`,
      {
        params: {
          api_key: TMDB_API_KEY,
          query: query,
          page: page,
          include_adult: false,
        },
      }
    );

    return response.data.results;
  } catch (error) {
    console.error('Error searching movies:', error);
    throw new Error('Failed to search movies');
  }
}

/**
 * Fetch movies using TMDB Discover API with advanced filters
 * Used for generating recommendation candidates
 * 
 * @param params - Discovery parameters
 * @returns Promise with array of movies
 */
export async function discoverMovies(params: {
  genreIds?: number[];
  minVoteCount?: number;
  minVoteAverage?: number;
  minYear?: number;
  maxYear?: number;
  language?: string;
  page?: number;
}): Promise<Movie[]> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API key is not configured');
  }

  try {
    const queryParams: any = {
      api_key: TMDB_API_KEY,
      sort_by: 'vote_average.desc',
      page: params.page || 1,
      include_adult: false,
    };

    if (params.genreIds && params.genreIds.length > 0) {
      queryParams.with_genres = params.genreIds.join('|');
    }

    if (params.minVoteCount) {
      queryParams['vote_count.gte'] = params.minVoteCount;
    }

    if (params.minVoteAverage) {
      queryParams['vote_average.gte'] = params.minVoteAverage;
    }

    if (params.minYear) {
      queryParams['primary_release_date.gte'] = `${params.minYear}-01-01`;
    }

    if (params.maxYear) {
      queryParams['primary_release_date.lte'] = `${params.maxYear}-12-31`;
    }

    if (params.language) {
      queryParams.with_original_language = params.language;
    }

    const response = await axios.get<TMDBResponse>(
      `${TMDB_BASE_URL}/discover/movie`,
      { params: queryParams }
    );

    return response.data.results;
  } catch (error) {
    console.error('Error discovering movies:', error);
    throw new Error('Failed to discover movies');
  }
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

/**
 * Fetch trending movie posters for marquee display
 * 
 * @returns Promise with array of poster paths
 */
export async function fetchTrendingPosters(): Promise<string[]> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB API key not configured');
    return [];
  }

  try {
    const response = await axios.get<TMDBResponse>(`${TMDB_BASE_URL}/trending/movie/week`, {
      params: {
        api_key: TMDB_API_KEY,
      },
    });

    return response.data.results
      .filter((movie) => movie.poster_path)
      .map((movie) => movie.poster_path as string)
      .slice(0, 20); // Limit to 20 posters
  } catch (error) {
    console.error('Error fetching trending posters:', error);
    return [];
  }
}
