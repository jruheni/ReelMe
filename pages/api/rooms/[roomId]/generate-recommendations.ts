/**
 * API Route: Generate Recommendations
 * 
 * POST /api/rooms/[roomId]/generate-recommendations
 * 
 * Generates movie recommendations based on all participants' preferences
 * and updates the room's movie list
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Room, UserPreferences } from '@/types';
import { generateGroupRecommendations } from '@/lib/recommendations';

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
    // Fetch room
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomSnap.data() as Room;

    // Check if all participants have completed preferences
    const allCompleted = room.participants.every((p) => p.hasCompletedPreferences);
    
    if (!allCompleted) {
      return res.status(400).json({ 
        error: 'Not all participants have completed their preferences',
        participantsReady: room.participants.filter((p) => p.hasCompletedPreferences).length,
        totalParticipants: room.participants.length,
      });
    }

    // Get all user preferences
    const userPreferences = room.userPreferences || {};
    const allUserPreferences: UserPreferences[] = Object.values(userPreferences);

    if (allUserPreferences.length === 0) {
      return res.status(400).json({ error: 'No user preferences found' });
    }

    // Generate group recommendations
    const { movies, scores } = await generateGroupRecommendations(allUserPreferences);

    // Update room with recommendations
    await updateDoc(roomRef, {
      movieList: movies,
      recommendationScores: scores,
      preferences: {
        genres: Array.from(
          new Set(allUserPreferences.flatMap((p) => p.selectedGenres))
        ),
      },
    });

    return res.status(200).json({
      success: true,
      movieCount: movies.length,
      message: 'Recommendations generated successfully',
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return res.status(500).json({ 
      error: 'Failed to generate recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
