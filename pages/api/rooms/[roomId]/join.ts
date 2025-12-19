/**
 * API Route: Join Room
 * 
 * POST /api/rooms/[roomId]/join
 * 
 * Adds a participant to a room.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Room, Participant } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId } = req.query;
  const { participant } = req.body;

  if (!roomId || typeof roomId !== 'string') {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  if (!participant || !participant.id || !participant.nickname) {
    return res.status(400).json({ error: 'Participant data is required' });
  }

  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomSnap.data() as Room;

    // Check if nickname is already in use
    const nicknameInUse = room.participants.some(
      (p) => p.nickname.toLowerCase().trim() === participant.nickname.toLowerCase().trim()
    );

    if (nicknameInUse) {
      return res.status(400).json({
        error: 'That nickname is already in use in this room. Please choose another one.',
      });
    }

    // Check if participant already exists (by ID)
    const existingParticipant = room.participants.find(
      (p) => p.id === participant.id
    );

    if (existingParticipant) {
      return res.status(200).json({
        success: true,
        message: 'Participant already in room',
        room,
      });
    }

    // Add participant to room
    const newParticipant: Participant = {
      id: participant.id,
      nickname: participant.nickname,
      genres: participant.genres || [],
      joinedAt: new Date().toISOString(),
    };

    await updateDoc(roomRef, {
      participants: arrayUnion(newParticipant),
    });

    // Get updated room
    const updatedSnap = await getDoc(roomRef);
    const updatedRoom = updatedSnap.data() as Room;

    return res.status(200).json({
      success: true,
      room: updatedRoom,
    });
  } catch (error) {
    console.error('Error joining room:', error);
    return res.status(500).json({ error: 'Failed to join room' });
  }
}

