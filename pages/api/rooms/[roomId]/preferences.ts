/**
 * API Route: Save User Preferences
 * 
 * POST /api/rooms/[roomId]/preferences
 * 
 * Saves a participant's genre preferences and seed movies.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchMovieDetails } from '@/lib/tmdb';
import { Room, UserPreferences, SeedMovie } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId } = req.query;
  const { participantId, selectedGenres, seedMovieIds } = req.body;

  if (!roomId || typeof roomId !== 'string') {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  if (!participantId || !selectedGenres || !Array.isArray(selectedGenres)) {
    return res.status(400).json({ error: 'participantId and selectedGenres are required' });
  }

  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomSnap.data() as Room;

    // Fetch seed movie details if provided
    let seedMovies: SeedMovie[] = [];
    if (seedMovieIds && Array.isArray(seedMovieIds) && seedMovieIds.length > 0) {
      try {
        const seedPromises = seedMovieIds.slice(0, 3).map(async (id: number) => {
          const details = await fetchMovieDetails(id);
          return {
            id: details.id,
            title: details.title,
            poster_path: details.poster_path,
            genre_ids: details.genres?.map((g) => g.id) || [],
            keywords: details.keywords?.keywords?.map((k: any) => k.name) || [],
            runtime: details.runtime || 0,
            release_year: details.release_date
              ? new Date(details.release_date).getFullYear()
              : 0,
            vote_average: details.vote_average,
          } as SeedMovie;
        });
        seedMovies = await Promise.all(seedPromises);
      } catch (error) {
        console.error('Error fetching seed movie details:', error);
        // Continue without seed movies if fetch fails
      }
    }

    // Update participant's genres
    const updatedParticipants = room.participants.map((p) =>
      p.id === participantId
        ? { ...p, genres: selectedGenres, hasCompletedPreferences: true }
        : p
    );

    // Create or update user preferences
    const userPrefs: UserPreferences = {
      participantId,
      selectedGenres,
      seedMovies,
      createdAt: new Date().toISOString(),
    };

    const updatedUserPreferences = {
      ...(room.userPreferences || {}),
      [participantId]: userPrefs,
    };

    // Update room
    await updateDoc(roomRef, {
      participants: updatedParticipants,
      userPreferences: updatedUserPreferences,
    });

    // Get updated room
    const updatedSnap = await getDoc(roomRef);
    const updatedRoom = updatedSnap.data() as Room;

    return res.status(200).json({
      success: true,
      userPreferences: userPrefs,
      room: updatedRoom,
    });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return res.status(500).json({ error: 'Failed to save preferences' });
  }
}

