/**
 * Home Page
 * 
 * Landing page with options to create a new room or join an existing room.
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        router.push(`/room/${data.roomId}/join`);
      } else {
        alert('Failed to create room. Please try again.');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      router.push(`/room/${roomCode.toUpperCase()}/join`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">ReelMe</h1>
          <p className="text-blue-200">Create your shared movie watchlist</p>
        </div>

        {/* Create Room Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-4 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">Create a Room</h2>
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create New Room'}
          </button>
        </div>

        {/* Join Room Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">Join a Room</h2>
          <form onSubmit={handleJoinRoom}>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter room code (e.g., ABC123)"
              maxLength={6}
              className="w-full bg-white/20 text-white placeholder-blue-200 border border-white/30 rounded-lg py-3 px-4 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Join Room
            </button>
          </form>
        </div>

        {/* Info */}
        <p className="text-center text-blue-200 text-sm mt-6">
          Max 5 participants per room
        </p>
      </div>
    </div>
  );
}

