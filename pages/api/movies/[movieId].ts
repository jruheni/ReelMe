/**
 * API Route: Movie Details
 *
 * GET /api/movies/[movieId]
 *
 * Proxies TMDB movie details (including runtime, overview, and videos)
 * so the client can show a rich details modal.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { movieId } = req.query;

  if (!TMDB_API_KEY) {
    return res
      .status(500)
      .json({ error: 'TMDB API key is not configured on the server.' });
  }

  if (!movieId || typeof movieId !== 'string') {
    return res.status(400).json({ error: 'movieId is required' });
  }

  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, {
      params: {
        api_key: TMDB_API_KEY,
        append_to_response: 'videos',
      },
    });

    const data = response.data;

    // Try to find a YouTube trailer
    let trailerUrl: string | null = null;
    if (data.videos && Array.isArray(data.videos.results)) {
      const trailer = data.videos.results.find(
        (v: any) =>
          v.site === 'YouTube' &&
          v.type === 'Trailer' &&
          v.key &&
          !v.official
      ) || data.videos.results.find(
        (v: any) => v.site === 'YouTube' && v.type === 'Trailer' && v.key
      );

      if (trailer && trailer.key) {
        trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
      }
    }

    return res.status(200).json({
      success: true,
      movie: {
        id: data.id,
        title: data.title,
        overview: data.overview,
        runtime: data.runtime,
        release_date: data.release_date,
        vote_average: data.vote_average,
        poster_path: data.poster_path,
      },
      trailerUrl,
    });
  } catch (error) {
    console.error('Error fetching movie details from TMDB:', error);
    return res.status(500).json({ error: 'Failed to fetch movie details' });
  }
}


