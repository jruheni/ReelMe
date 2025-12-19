/**
 * API Route: Leave Room
 * 
 * POST /api/rooms/[roomId]/leave
 * 
 * Removes a participant from a room and cleans up their votes.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { compileWatchlist } from '@/lib/utils';
import { Room } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId } = req.query;
  const { participantId } = req.body;

  if (!roomId || typeof roomId !== 'string') {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  if (!participantId) {
    return res.status(400).json({ error: 'Participant ID is required' });
  }

  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomSnap.data() as Room;

    // Remove participant from participants array
    const updatedParticipants = room.participants.filter(
      (p) => p.id !== participantId
    );

    // Remove participant's votes
    const updatedVotes = { ...room.votes };
    delete updatedVotes[participantId];

    // Recompile watchlist without this participant's votes
    const updatedRoom = {
      ...room,
      participants: updatedParticipants,
      votes: updatedVotes,
    };
    const watchlist = compileWatchlist(updatedRoom);

    // Update room
    await updateDoc(roomRef, {
      participants: updatedParticipants,
      votes: updatedVotes,
      watchlist: watchlist,
    });

    // Get final room state
    const finalSnap = await getDoc(roomRef);
    const finalRoom = finalSnap.data() as Room;

    return res.status(200).json({
      success: true,
      room: finalRoom,
    });
  } catch (error) {
    console.error('Error leaving room:', error);
    return res.status(500).json({ error: 'Failed to leave room' });
  }
}

