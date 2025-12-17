/**
 * API Route: Fetch and Store Movies
 * 
 * POST /api/rooms/[roomId]/movies
 * 
 * Fetches movies from TMDB based on selected genres,
 * ranks them, and stores in the room document.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchMultiplePages } from '@/lib/tmdb';
import { rankMovies } from '@/lib/utils';
import { Room, Movie } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId } = req.query;
  const { genreIds } = req.body;

  if (!roomId || typeof roomId !== 'string') {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  if (!genreIds || !Array.isArray(genreIds) || genreIds.length === 0) {
    return res.status(400).json({ error: 'Genre IDs are required' });
  }

  try {
    // Verify room exists
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Fetch movies from TMDB
    const movies = await fetchMultiplePages(genreIds, 3); // Fetch 3 pages (~60 movies)

    // Rank movies based on genre match, rating, and recency
    const rankedMovies = rankMovies(movies, genreIds);

    // Update room with movie list
    await updateDoc(roomRef, {
      movieList: rankedMovies,
      preferences: {
        genres: genreIds,
      },
    });

    // Get updated room
    const updatedSnap = await getDoc(roomRef);
    const updatedRoom = updatedSnap.data() as Room;

    return res.status(200).json({
      success: true,
      movieCount: rankedMovies.length,
      room: updatedRoom,
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    return res.status(500).json({ error: 'Failed to fetch movies' });
  }
}

