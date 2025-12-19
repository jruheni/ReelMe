/**
 * Room Landing (Lobby) Page
 *
 * Shows room code, participants, and readiness state.
 * Users can leave the room, and once all expected participants have joined
 * and set their genre preferences, a card appears to begin swiping.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Room, Participant } from '@/types';

export default function RoomLandingPage() {
  const router = useRouter();
  const { roomId, participantId } = router.query;
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-leave room when tab closes
  useEffect(() => {
    if (!roomId || typeof roomId !== 'string') return;

    const participantIdStr =
      typeof participantId === 'string'
        ? participantId
        : Array.isArray(participantId)
        ? participantId[0]
        : '';

    if (!participantIdStr) return;

    const handleBeforeUnload = async () => {
      try {
        await fetch(`/api/rooms/${roomId}/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ participantId: participantIdStr }),
          keepalive: true,
        });
      } catch (e) {
        console.error('Error leaving room on unload', e);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId, participantId]);

  // Fetch room data
  useEffect(() => {
    if (!roomId || typeof roomId !== 'string') return;

    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        const data = await response.json();

        if (data.success) {
          setRoom(data.room);
        }
      } catch (error) {
        console.error('Error fetching room:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();

    // Poll for updates so users see others joining / completing preferences
    const interval = setInterval(fetchRoom, 5000);
    return () => clearInterval(interval);
  }, [roomId]);

  const participantIdStr =
    typeof participantId === 'string'
      ? participantId
      : Array.isArray(participantId)
      ? participantId[0]
      : '';

  const handleLeaveRoom = async () => {
    if (!roomId || !participantIdStr) {
      router.push('/');
      return;
    }

    try {
      await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participantId: participantIdStr }),
      });
    } catch (e) {
      console.error('Error leaving room on server', e);
    }

    // Clear stored data for this room
    try {
      localStorage.removeItem(`participant_${roomId}`);
      localStorage.removeItem(`room_${roomId}`);
    } catch (e) {
      console.error('Error clearing room data from localStorage', e);
    }

    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading room...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
          <p className="text-white mb-4">Room not found.</p>
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

  const expectedCount =
    typeof room.expectedParticipants === 'number'
      ? room.expectedParticipants
      : room.participants.length || 0;

  const currentCount = room.participants.length;

  const allJoined = currentCount >= expectedCount;

  const allHaveGenres = room.participants.every(
    (p: Participant) => p.genres && p.genres.length > 0
  );

  const moviesReady = room.movieList && room.movieList.length > 0;

  // Allow swiping as soon as movies are ready – no need to wait for everyone
  const canStartSwiping = moviesReady;

  const currentParticipant = room.participants.find(
    (p) => p.id === participantIdStr
  );

  return (
    <div className="min-h-screen bg-black p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Room Info Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Room Lobby
              </h1>
              <p className="text-blue-200 text-sm">
                {currentParticipant
                  ? `You are: ${currentParticipant.nickname}`
                  : 'You are in this room'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-xs mb-1">Room Code</p>
              <p className="text-white font-mono text-lg font-semibold">
                {room.roomId}
              </p>
            </div>
          </div>

          {/* Participants status */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-200 text-sm">
              Participants: {currentCount}/{expectedCount}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/room/${roomId}/preferences?participantId=${participantIdStr}`}
              className="inline-flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
            >
              Edit Preferences
            </Link>
            <button
              onClick={handleLeaveRoom}
              className="inline-flex-1 bg-red-600/80 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
            >
              Leave Room
            </button>
          </div>
        </div>

        {/* Participants List */}
        {room.participants.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
            <h2 className="text-white font-semibold mb-3">Participants</h2>
            <div className="flex flex-wrap gap-2">
              {room.participants.map((participant) => {
                const hasGenres =
                  participant.genres && participant.genres.length > 0;
                return (
                  <div
                    key={participant.id}
                    className="bg-blue-600/30 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    <span>{participant.nickname}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        hasGenres ? 'bg-green-400' : 'bg-yellow-300'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Start Swiping Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-2">
            Swiping Status
          </h2>
          {canStartSwiping ? (
            <div>
              <p className="text-blue-200 text-sm mb-4">
                All participants are in and preferences are set. Movies are
                ready to swipe!
              </p>
              <Link
                href={`/room/${roomId}/swipe?participantId=${participantIdStr}`}
                className="block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg text-center"
              >
                Start Swiping
              </Link>
            </div>
          ) : (
            <div className="text-blue-200 text-sm">
              <p className="mb-2">
                Waiting for everyone to be ready before starting swiping.
              </p>
              <ul className="list-disc list-inside text-xs space-y-1">
                {!allJoined && (
                  <li>
                    Waiting for all expected participants ({expectedCount}) to
                    join.
                  </li>
                )}
                {!allHaveGenres && (
                  <li>
                    Some participants still need to select their genres.
                  </li>
                )}
                {!moviesReady && (
                  <li>
                    Movies are still being prepared. This should happen
                    automatically once everyone has saved their preferences.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


