/**
 * API Route: Generate Recommendations
 * 
 * POST /api/rooms/[roomId]/generate-recommendations
 * 
 * Generates movie recommendations based on all participants' preferences.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { discoverMovies } from '@/lib/tmdb';
import { rankMovies } from '@/lib/utils';
import { Room } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId } = req.query;

  if (!roomId || typeof roomId !== 'string') {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomSnap.data() as Room;

    // Collect all genres from all participants
    const allGenres = new Set<number>();
    room.participants.forEach((p) => {
      if (p.genres && p.genres.length > 0) {
        p.genres.forEach((g) => allGenres.add(g));
      }
    });

    // Also check userPreferences for genres
    if (room.userPreferences) {
      Object.values(room.userPreferences).forEach((prefs) => {
        if (prefs.selectedGenres) {
          prefs.selectedGenres.forEach((g) => allGenres.add(g));
        }
      });
    }

    const genreIds = Array.from(allGenres);

    if (genreIds.length === 0) {
      return res.status(400).json({ error: 'No genres selected by participants' });
    }

    // Fetch movies from TMDB (fetch multiple pages for larger pool)
    const allMovies = [];
    for (let page = 1; page <= 5; page++) {
      const movies = await discoverMovies({
        genreIds,
        minVoteCount: 500,
        minVoteAverage: 7.0,
        page,
      });
      allMovies.push(...movies);
      if (movies.length < 20) break; // Stop if we got less than a full page
    }

    // Remove duplicates
    const uniqueMovies = Array.from(
      new Map(allMovies.map((movie) => [movie.id, movie])).values()
    );

    // Rank movies
    const rankedMovies = rankMovies(uniqueMovies, genreIds);

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
    console.error('Error generating recommendations:', error);
    return res.status(500).json({ error: 'Failed to generate recommendations' });
  }
}

