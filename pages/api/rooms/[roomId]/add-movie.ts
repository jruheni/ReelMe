/**
 * API Route: Manually Add Movie to Room
 *
 * POST /api/rooms/[roomId]/add-movie
 *
 * Adds a movie by TMDB ID to the room's movieList and watchlist.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import axios from 'axios';
import { db } from '@/lib/firebase';
import { Room, Movie } from '@/types';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId } = req.query;
  const { movieId } = req.body;

  if (!roomId || typeof roomId !== 'string') {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  if (!movieId || typeof movieId !== 'number') {
    return res.status(400).json({ error: 'movieId (number) is required' });
  }

  if (!TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API key not configured' });
  }

  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomSnap.data() as Room;

    // Fetch basic movie data from TMDB
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, {
      params: {
        api_key: TMDB_API_KEY,
      },
    });

    const data = response.data;

    const movie: Movie = {
      id: data.id,
      title: data.title,
      poster_path: data.poster_path,
      release_date: data.release_date,
      vote_average: data.vote_average,
      overview: data.overview,
      genre_ids: data.genres?.map((g: any) => g.id) || [],
      backdrop_path: data.backdrop_path,
    };

    // Avoid duplicates
    const existingIds = new Set(room.movieList.map((m) => m.id));
    const update: any = {};

    if (!existingIds.has(movie.id)) {
      update.movieList = arrayUnion(movie);
    }

    update.watchlist = arrayUnion(movie);

    await updateDoc(roomRef, update);

    const updatedSnap = await getDoc(roomRef);
    const updatedRoom = updatedSnap.data() as Room;

    return res.status(200).json({
      success: true,
      room: updatedRoom,
    });
  } catch (error) {
    console.error('Error adding movie manually:', error);
    return res.status(500).json({ error: 'Failed to add movie' });
  }
}

