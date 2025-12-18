/**
 * API Route: Save User Preferences
 * 
 * POST /api/rooms/[roomId]/preferences
 * 
 * Saves user's genre selections and seed movies to build preference profile
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Room, UserPreferences, SeedMovie } from '@/types';
import { fetchSeedMovies, buildPreferenceProfile } from '@/lib/recommendations';

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

  if (!participantId || typeof participantId !== 'string') {
    return res.status(400).json({ error: 'Participant ID is required' });
  }

  if (!selectedGenres || !Array.isArray(selectedGenres) || selectedGenres.length === 0) {
    return res.status(400).json({ error: 'At least one genre must be selected' });
  }

  if (!seedMovieIds || !Array.isArray(seedMovieIds) || seedMovieIds.length !== 3) {
    return res.status(400).json({ error: 'Exactly 3 seed movies must be selected' });
  }

  try {
    // Verify room exists
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomSnap.data() as Room;

    // Verify participant is in the room
    const participant = room.participants.find((p) => p.id === participantId);
    if (!participant) {
      return res.status(403).json({ error: 'Participant not found in room' });
    }

    // Fetch seed movie details with keywords
    const seedMovies: SeedMovie[] = await fetchSeedMovies(seedMovieIds);

    if (seedMovies.length !== 3) {
      return res.status(400).json({ 
        error: 'Failed to fetch all seed movies. Please try again.' 
      });
    }

    // Build preference profile
    const profile = buildPreferenceProfile(seedMovies, selectedGenres);

    // Create user preferences object
    const userPreferences: UserPreferences = {
      participantId,
      selectedGenres,
      seedMovies,
      profile,
      createdAt: new Date().toISOString(),
    };

    // Update room with user preferences
    const updatedUserPreferences = {
      ...(room.userPreferences || {}),
      [participantId]: userPreferences,
    };

    // Update participant to mark preferences as completed
    const updatedParticipants = room.participants.map((p) =>
      p.id === participantId ? { ...p, hasCompletedPreferences: true, genres: selectedGenres } : p
    );

    await updateDoc(roomRef, {
      userPreferences: updatedUserPreferences,
      participants: updatedParticipants,
    });

    return res.status(200).json({
      success: true,
      message: 'Preferences saved successfully',
      userPreferences,
    });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return res.status(500).json({ 
      error: 'Failed to save preferences',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
