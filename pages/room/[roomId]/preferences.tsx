/**
 * Preferences Page
 * 
 * Allows participants to select movie genres.
 * Once all participants have selected, fetches and ranks movies.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Room, Participant } from '@/types';
import { GENRES } from '@/types';

export default function Preferences() {
  const router = useRouter();
  const { roomId, participantId } = router.query;
  const [room, setRoom] = useState<Room | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingMovies, setIsFetchingMovies] = useState(false);

  // Fetch room data
  useEffect(() => {
    if (!roomId || typeof roomId !== 'string') return;

    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        const data = await response.json();

        if (data.success) {
          setRoom(data.room);
          
          // Load participant's existing genres if they've already selected
          const participant = data.room.participants.find(
            (p: Participant) => p.id === participantId
          );
          if (participant && participant.genres.length > 0) {
            setSelectedGenres(participant.genres);
          }
        }
      } catch (error) {
        console.error('Error fetching room:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomId, participantId]);

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId]
    );
  };

  const handleSavePreferences = async () => {
    if (selectedGenres.length === 0) {
      alert('Please select at least one genre');
      return;
    }

    if (!roomId || typeof roomId !== 'string' || !participantId) return;

    setIsSaving(true);

    try {
      // Update participant's genres
      const updatedParticipants = room?.participants.map((p) =>
        p.id === participantId
          ? { ...p, genres: selectedGenres }
          : p
      ) || [];

      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participants: updatedParticipants,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRoom(data.room);
        
        // Check if all participants have selected genres
        const allHaveGenres = data.room.participants.every(
          (p: Participant) => p.genres.length > 0
        );

        if (allHaveGenres && data.room.movieList.length === 0) {
          // Fetch movies for the room
          await fetchMovies(data.room);
        } else {
          // Navigate to swipe page
          router.push(`/room/${roomId}/swipe?participantId=${participantId}`);
        }
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchMovies = async (roomData: Room) => {
    setIsFetchingMovies(true);

    try {
      // Combine all participants' genres
      const allGenres = new Set<number>();
      roomData.participants.forEach((p) => {
        p.genres.forEach((g) => allGenres.add(g));
      });

      const genreIds = Array.from(allGenres);

      const response = await fetch(`/api/rooms/${roomId}/movies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ genreIds }),
      });

      const data = await response.json();

      if (data.success) {
        // Navigate to swipe page
        router.push(`/room/${roomId}/swipe?participantId=${participantId}`);
      } else {
        alert('Failed to fetch movies');
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
      alert('Failed to fetch movies');
    } finally {
      setIsFetchingMovies(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl mb-4">
          <h1 className="text-2xl font-bold text-white mb-2">Select Genres</h1>
          <p className="text-blue-200 text-sm mb-6">
            Choose the movie genres you're interested in
          </p>

          {/* Genre Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {Object.entries(GENRES).map(([id, name]) => {
              const genreId = Number(id);
              const isSelected = selectedGenres.includes(genreId);

              return (
                <button
                  key={genreId}
                  onClick={() => toggleGenre(genreId)}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {/* Selected Count */}
          <p className="text-white text-sm mb-4">
            Selected: {selectedGenres.length} genre{selectedGenres.length !== 1 ? 's' : ''}
          </p>

          {/* Save Button */}
          <button
            onClick={handleSavePreferences}
            disabled={isSaving || isFetchingMovies || selectedGenres.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetchingMovies
              ? 'Fetching Movies...'
              : isSaving
              ? 'Saving...'
              : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

