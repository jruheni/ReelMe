/**
 * API Route: Get Movie Details
 * 
 * GET /api/movies/[movieId]
 * 
 * Fetches detailed movie information including runtime and trailer.
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

  const { movieId } = req.query;

  if (!movieId || typeof movieId !== 'string') {
    return res.status(400).json({ error: 'Movie ID is required' });
  }

  if (!TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API key not configured' });
  }

  try {
    // Fetch movie details with videos
    const [movieResponse, videosResponse] = await Promise.all([
      axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, {
        params: { api_key: TMDB_API_KEY },
      }),
      axios.get(`${TMDB_BASE_URL}/movie/${movieId}/videos`, {
        params: { api_key: TMDB_API_KEY },
      }),
    ]);

    const movie = movieResponse.data;
    const videos = videosResponse.data;

    // Find YouTube trailer
    let trailerUrl: string | null = null;
    const trailer = videos.results?.find(
      (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
    );
    if (trailer) {
      trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
    }

    return res.status(200).json({
      success: true,
      movie: {
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        runtime: movie.runtime,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        poster_path: movie.poster_path,
      },
      trailerUrl,
    });
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return res.status(500).json({ error: 'Failed to fetch movie details' });
  }
}

