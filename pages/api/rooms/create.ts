/**
 * API Route: Create Room
 * 
 * POST /api/rooms/create
 * 
 * Creates a new room with a unique room code.
 * Initializes empty participants, movieList, votes, and watchlist.
 * Optionally accepts expectedParticipants (number of users expected in the room).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateRoomCode } from '@/lib/utils';
import { Room } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { expectedParticipants } = req.body || {};

    // Generate unique room code
    let roomId = generateRoomCode();
    let roomExists = true;
    
    // Ensure room code is unique (check if it exists)
    while (roomExists) {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        roomExists = false;
      } else {
        roomId = generateRoomCode(); // Generate new code if collision
      }
    }

    // Create room document
    const newRoom: Room = {
      roomId,
      createdAt: new Date().toISOString(),
      participants: [],
      movieList: [],
      votes: {},
      watchlist: [],
      expectedParticipants: typeof expectedParticipants === 'number'
        ? Math.min(Math.max(expectedParticipants, 1), 10) // clamp between 1 and 10
        : undefined,
    };

    // Save to Firestore
    const roomRef = doc(db, 'rooms', roomId);
    await setDoc(roomRef, newRoom);

    return res.status(201).json({
      success: true,
      roomId,
      room: newRoom,
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return res.status(500).json({ error: 'Failed to create room' });
  }
}

