/**
 * Swipe Interface Page
 * 
 * Main swiping interface where participants swipe through movies.
 * Shows cards in a stack, handles votes, and updates Firestore.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AnimatePresence } from 'framer-motion';
import { Room, Movie, VoteType } from '@/types';
import SwipeableMovieCard from '@/components/SwipeableMovieCard';
import { getPosterUrl } from '@/lib/utils';
import Link from 'next/link';

export default function SwipePage() {
  const router = useRouter();
  const { roomId, participantId } = router.query;
  const [room, setRoom] = useState<Room | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [orderedMovies, setOrderedMovies] = useState<Movie[]>([]);

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

    const participantIdStr =
      typeof participantId === 'string'
        ? participantId
        : Array.isArray(participantId)
        ? participantId[0]
        : '';

    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        const data = await response.json();

        if (data.success) {
          const loadedRoom: Room = data.room;
          setRoom(loadedRoom);

          // Build ordered movie list for this user:
          // 1) watchlist movies first
          // 2) then the rest
          const watchlistIds = new Set(
            (loadedRoom.watchlist || []).map((m: Movie) => m.id)
          );

          const watchlistFirst = loadedRoom.movieList.filter((m: Movie) =>
            watchlistIds.has(m.id)
          );
          const others = loadedRoom.movieList.filter(
            (m: Movie) => !watchlistIds.has(m.id)
          );

          const ordered = [...watchlistFirst, ...others].filter(
            (movie, idx, arr) =>
              arr.findIndex((x) => x.id === movie.id) === idx
          );

          setOrderedMovies(ordered);

          // Find current position (skip already voted movies by this participant)
          if (loadedRoom.votes && participantIdStr) {
            const votedMovieIds = Object.keys(
              loadedRoom.votes[participantIdStr] || {}
            ).map(Number);
            const firstUnvotedIndex = ordered.findIndex(
              (m: Movie) => !votedMovieIds.includes(m.id)
            );
            setCurrentIndex(firstUnvotedIndex >= 0 ? firstUnvotedIndex : 0);
          } else {
            setCurrentIndex(0);
          }
        }
      } catch (error) {
        console.error('Error fetching room:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();

    // Poll for room updates (to see other participants' progress)
    const interval = setInterval(fetchRoom, 5000);
    return () => clearInterval(interval);
  }, [roomId, participantId]);

  const handleSwipe = async (vote: VoteType) => {
    if (!room || !participantId || typeof participantId !== 'string') return;

    const currentMovie = orderedMovies[currentIndex];
    if (!currentMovie) return;

    setIsVoting(true);

    try {
      const response = await fetch(`/api/rooms/${roomId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId,
          movieId: currentMovie.id,
          voteType: vote,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRoom(data.room);
        
        // Move to next movie
        const nextIndex = currentIndex + 1;
        if (nextIndex < orderedMovies.length) {
          setCurrentIndex(nextIndex);
        } else {
          alert("You've finished swiping through all movies!");
        }
      } else {
        alert('Failed to save vote. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      alert('Failed to save vote. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading movies...</div>
      </div>
    );
  }

  if (!room || orderedMovies.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
          <p className="text-white mb-4">No movies available yet.</p>
          <p className="text-blue-200 text-sm mb-4">
            Make sure all participants have selected their preferences.
          </p>
          <button
            onClick={() => router.push(`/room/${roomId}/preferences?participantId=${participantId}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
          >
            Go to Preferences
          </button>
        </div>
      </div>
    );
  }

  const currentMovie = orderedMovies[currentIndex];
  const nextMovie = orderedMovies[currentIndex + 1];
  const progress = ((currentIndex + 1) / orderedMovies.length) * 100;
  const participant = room.participants.find((p) => p.id === participantId);

  return (
    <div className="min-h-screen bg-black p-4 pb-24">
      {/* Header */}
      <div className="max-w-md mx-auto mb-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-white font-semibold">
              {participant?.nickname || 'You'}
            </h1>
            <Link
              href={`/room/${roomId}/watchlist?participantId=${participantId}`}
              className="text-blue-300 hover:text-blue-200 text-sm"
            >
              View Watchlist
            </Link>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-blue-200 text-xs mt-2 text-center">
            {currentIndex + 1} / {room.movieList.length}
          </p>
        </div>
      </div>

      {/* Movie Cards Stack */}
      <div className="relative max-w-md mx-auto h-[70vh] max-h-[700px] flex items-center">
        <AnimatePresence>
          {/* Next card (peeking behind) */}
          {nextMovie && (
            <div
              key={`next-${nextMovie.id}`}
              className="absolute inset-0 flex items-center justify-center"
              style={{ zIndex: 1 }}
            >
              <div className="w-full max-w-md mx-auto">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden opacity-50 scale-95">
                  <div className="aspect-[2/3] bg-gray-200">
                    <img
                      src={getPosterUrl(nextMovie.poster_path, 'w500')}
                      alt={nextMovie.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current card */}
          {currentMovie && (
            <SwipeableMovieCard
              key={currentMovie.id}
              movie={currentMovie}
              onSwipe={handleSwipe}
              index={0}
            />
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!currentMovie && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
              <p className="text-white text-xl mb-4">🎉 All done!</p>
              <p className="text-blue-200 mb-4">
                You've swiped through all movies.
              </p>
              <Link
                href={`/room/${roomId}/watchlist?participantId=${participantId}`}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
              >
                View Watchlist
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Manual buttons (fallback for non-swipe devices) - hidden on mobile */}
      <div className="hidden md:flex max-w-sm mx-auto mt-4 gap-4">
        <button
          onClick={() => handleSwipe('discarded')}
          disabled={isVoting || !currentMovie}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50"
        >
          👈 Discard
        </button>
        <button
          onClick={() => handleSwipe('maybe')}
          disabled={isVoting || !currentMovie}
          className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50"
        >
          Maybe 👉
        </button>
        <button
          onClick={() => handleSwipe('liked')}
          disabled={isVoting || !currentMovie}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50"
        >
          ❤️ Like
        </button>
      </div>
    </div>
  );
}

