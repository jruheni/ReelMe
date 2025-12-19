/**
 * API Route: Search Movies
 * 
 * GET /api/search-movies?query=...
 * 
 * Searches for movies by title using TMDB API.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { searchMovies } from '@/lib/tmdb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const results = await searchMovies(query, 1);
    
    // Ensure results is an array - if not, return empty array
    if (!results || !Array.isArray(results)) {
      console.warn('searchMovies did not return an array:', results);
      return res.status(200).json({
        success: true,
        results: [],
      });
    }
    
    // Limit to 10 results and map to simplified format
    const limitedResults = results
      .slice(0, 10)
      .filter((movie) => movie && movie.id) // Filter out any invalid entries
      .map((movie) => ({
        id: movie.id,
        title: movie.title || 'Unknown',
        release_date: movie.release_date || '',
        poster_path: movie.poster_path || null,
        vote_average: movie.vote_average || 0,
      }));

    return res.status(200).json({
      success: true,
      results: limitedResults,
    });
  } catch (error) {
    console.error('Error searching movies:', error);
    // Always return success with empty results on error
    return res.status(200).json({
      success: true,
      results: [],
    });
  }
}

