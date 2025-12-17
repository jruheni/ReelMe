/**
 * API Route: Get/Update Room
 * 
 * GET /api/rooms/[roomId] - Get room data
 * PUT /api/rooms/[roomId] - Update room data
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Room } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { roomId } = req.query;

  if (!roomId || typeof roomId !== 'string') {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  try {
    const roomRef = doc(db, 'rooms', roomId);

    if (req.method === 'GET') {
      // Get room data
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        return res.status(404).json({ error: 'Room not found' });
      }

      return res.status(200).json({
        success: true,
        room: roomSnap.data() as Room,
      });
    } else if (req.method === 'PUT') {
      // Update room data
      const updateData = req.body;

      // Validate that room exists
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) {
        return res.status(404).json({ error: 'Room not found' });
      }

      // Update room
      await updateDoc(roomRef, updateData);

      // Return updated room
      const updatedSnap = await getDoc(roomRef);
      return res.status(200).json({
        success: true,
        room: updatedSnap.data() as Room,
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling room request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

