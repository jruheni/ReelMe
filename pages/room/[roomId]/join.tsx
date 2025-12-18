/**
 * Join Room Page
 * 
 * Allows users to join a room with a nickname.
 * Validates room exists and has space.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Room, Participant } from '@/types';
import { generateParticipantId } from '@/lib/utils';

export default function JoinRoom() {
  const router = useRouter();
  const { roomId } = router.query;
  const [nickname, setNickname] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  // Fetch room data
  useEffect(() => {
    if (!roomId || typeof roomId !== 'string') return;

    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        const data = await response.json();

        if (data.success) {
          setRoom(data.room);
        } else {
          setError('Room not found');
        }
      } catch (error) {
        console.error('Error fetching room:', error);
        setError('Failed to load room');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !roomId || typeof roomId !== 'string') return;

    setIsJoining(true);
    setError('');

    try {
      const participantId = generateParticipantId();
      const participant: Participant = {
        id: participantId,
        nickname: nickname.trim(),
        genres: [],
        joinedAt: new Date().toISOString(),
      };

      // Store participant ID in localStorage for persistence
      localStorage.setItem(`participant_${roomId}`, participantId);

      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participant }),
      });

      const data = await response.json();

      if (data.success) {
        // Store room and participant info
        localStorage.setItem(`room_${roomId}`, JSON.stringify({
          roomId,
          participantId,
          nickname: participant.nickname,
        }));

        // Navigate to preferences page
        router.push(`/room/${roomId}/preferences?participantId=${participantId}`);
      } else {
        setError(data.error || 'Failed to join room');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading room...</div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-2">Join Room</h1>
          <p className="text-blue-200 mb-6">Room Code: <span className="font-mono font-bold">{roomId}</span></p>

          {room && (
            <div className="mb-6">
              <p className="text-white text-sm mb-2">
                Participants: {room.participants.length}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleJoin}>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname"
              maxLength={20}
              required
              disabled={isJoining || (room?.participants.length || 0) >= 5}
              className="w-full bg-white/20 text-white placeholder-blue-200 border border-white/30 rounded-lg py-3 px-4 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isJoining}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

