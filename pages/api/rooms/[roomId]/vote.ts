/**
 * API Route: Submit Vote
 * 
 * POST /api/rooms/[roomId]/vote
 * 
 * Records a participant's vote (liked, maybe, or discarded) for a movie.
 * Updates the watchlist after voting.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { compileWatchlist } from '@/lib/utils';
import { Room, VoteType } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId } = req.query;
  const { participantId, movieId, voteType } = req.body;

  if (!roomId || typeof roomId !== 'string') {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  if (!participantId || !movieId || !voteType) {
    return res.status(400).json({ error: 'participantId, movieId, and voteType are required' });
  }

  const validVoteTypes: VoteType[] = ['liked', 'maybe', 'discarded'];
  if (!validVoteTypes.includes(voteType)) {
    return res.status(400).json({ error: 'Invalid vote type. Must be: liked, maybe, or discarded' });
  }

  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomSnap.data() as Room;

    // Initialize votes object if it doesn't exist
    if (!room.votes) {
      room.votes = {};
    }

    // Initialize participant's votes if they don't exist
    if (!room.votes[participantId]) {
      room.votes[participantId] = {};
    }

    // Update vote
    room.votes[participantId][movieId] = voteType;

    // Compile watchlist from all votes
    const watchlist = compileWatchlist(room);

    // Update room with new votes and watchlist
    await updateDoc(roomRef, {
      votes: room.votes,
      watchlist: watchlist,
    });

    // Get updated room
    const updatedSnap = await getDoc(roomRef);
    const updatedRoom = updatedSnap.data() as Room;

    return res.status(200).json({
      success: true,
      room: updatedRoom,
    });
  } catch (error) {
    console.error('Error submitting vote:', error);
    return res.status(500).json({ error: 'Failed to submit vote' });
  }
}

