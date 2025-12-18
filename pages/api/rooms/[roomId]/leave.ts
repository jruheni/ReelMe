/**
 * API Route: Leave Room
 *
 * POST /api/rooms/[roomId]/leave
 *
 * Removes a participant from a room, along with their votes,
 * and recalculates the watchlist.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Room } from '@/types';
import { compileWatchlist } from '@/lib/utils';

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

  if (!participantId || typeof participantId !== 'string') {
    return res.status(400).json({ error: 'participantId is required' });
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

    // Remove participant's votes if present
    if (room.votes && room.votes[participantId]) {
      delete room.votes[participantId];
    }

    // Recalculate watchlist based on remaining votes
    const updatedRoomForWatchlist: Room = {
      ...room,
      participants: updatedParticipants,
    };

    const updatedWatchlist = compileWatchlist(updatedRoomForWatchlist);

    await updateDoc(roomRef, {
      participants: updatedParticipants,
      votes: room.votes,
      watchlist: updatedWatchlist,
    });

    const updatedSnap = await getDoc(roomRef);
    const updatedRoom = updatedSnap.data() as Room;

    return res.status(200).json({
      success: true,
      room: updatedRoom,
    });
  } catch (error) {
    console.error('Error leaving room:', error);
    return res.status(500).json({ error: 'Failed to leave room' });
  }
}


