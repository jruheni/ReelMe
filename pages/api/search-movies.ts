/**
 * API Route: Search Movies by Title
 *
 * GET /api/search-movies?query=...
 *
 * Returns a list of TMDB movies matching the given title query.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API key not configured' });
  }

  const query = String(req.query.query || '').trim();

  if (!query) {
    return res.status(400).json({ error: 'query parameter is required' });
  }

  try {
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        query,
        include_adult: false,
      },
    });

    const results = Array.isArray(response.data.results)
      ? response.data.results.slice(0, 10)
      : [];

    return res.status(200).json({
      success: true,
      movies: results.map((m: any) => ({
        id: m.id,
        title: m.title,
        release_date: m.release_date,
        poster_path: m.poster_path,
        vote_average: m.vote_average,
        genre_ids: m.genre_ids || [],
        overview: m.overview,
      })),
    });
  } catch (error) {
    console.error('Error searching movies on TMDB:', error);
    return res.status(500).json({ error: 'Failed to search movies' });
  }
}


