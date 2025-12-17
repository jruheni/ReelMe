/**
 * Watchlist View Page
 * 
 * Displays the compiled watchlist of all "liked" and "maybe" movies
 * from all participants. Shows movie details and allows sorting.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Room, Movie } from '@/types';
import { getPosterUrl } from '@/lib/utils';
import Link from 'next/link';

type SortOption = 'rating' | 'recency' | 'title';

export default function WatchlistPage() {
  const router = useRouter();
  const { roomId, participantId } = router.query;
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('rating');

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

    // Poll for updates
    const interval = setInterval(fetchRoom, 5000);
    return () => clearInterval(interval);
  }, [roomId]);

  // Sort watchlist
  const sortedWatchlist = room?.watchlist ? [...room.watchlist].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.vote_average - a.vote_average;
      case 'recency':
        const aYear = new Date(a.release_date).getFullYear();
        const bYear = new Date(b.release_date).getFullYear();
        return bYear - aYear;
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  }) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading watchlist...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Watchlist</h1>
            <Link
              href={`/room/${roomId}/swipe?participantId=${participantId}`}
              className="text-blue-300 hover:text-blue-200 text-sm"
            >
              Back to Swiping
            </Link>
          </div>

          {/* Sort Options */}
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('rating')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                sortBy === 'rating'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              ⭐ Rating
            </button>
            <button
              onClick={() => setSortBy('recency')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                sortBy === 'recency'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              📅 Newest
            </button>
            <button
              onClick={() => setSortBy('title')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                sortBy === 'title'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              🔤 Title
            </button>
          </div>

          <p className="text-blue-200 text-sm mt-4">
            {sortedWatchlist.length} movie{sortedWatchlist.length !== 1 ? 's' : ''} in watchlist
          </p>
        </div>

        {/* Watchlist Grid */}
        {sortedWatchlist.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
            <p className="text-white text-lg mb-2">No movies in watchlist yet</p>
            <p className="text-blue-200 text-sm mb-4">
              Start swiping to add movies!
            </p>
            <Link
              href={`/room/${roomId}/swipe?participantId=${participantId}`}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
              Start Swiping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {sortedWatchlist.map((movie) => {
              const releaseYear = movie.release_date
                ? new Date(movie.release_date).getFullYear()
                : 'N/A';

              return (
                <div
                  key={movie.id}
                  className="bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden hover:bg-white/20 transition-colors"
                >
                  <div className="aspect-[2/3] bg-gray-200">
                    <img
                      src={getPosterUrl(movie.poster_path, 'w500')}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                      {movie.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-blue-200">
                      <span className="flex items-center gap-1">
                        <span>⭐</span>
                        {movie.vote_average.toFixed(1)}
                      </span>
                      <span>{releaseYear}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Participants Info */}
        {room && room.participants.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mt-4">
            <h2 className="text-white font-semibold mb-3">Participants</h2>
            <div className="flex flex-wrap gap-2">
              {room.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="bg-blue-600/30 text-white px-3 py-1 rounded-full text-sm"
                >
                  {participant.nickname}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

