/**
 * Preferences Page
 * 
 * Allows participants to:
 * 1. Select movie genres
 * 2. Search and select 3 seed movies they already like
 * This builds their preference profile for recommendations
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Room, Participant, Movie } from '@/types';
import { GENRES } from '@/types';
import { getPosterUrl } from '@/lib/utils';

export default function Preferences() {
  const router = useRouter();
  const { roomId, participantId } = router.query;
  const [room, setRoom] = useState<Room | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [seedMovies, setSeedMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<'genres' | 'seeds'>('genres');

  const participantIdStr =
    typeof participantId === 'string'
      ? participantId
      : Array.isArray(participantId)
      ? participantId[0]
      : '';

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
            (p: Participant) => p.id === participantIdStr
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

  // Search for movies
  const searchMovies = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search-movies?query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Ensure we have a valid response with results array
      if (data && data.success && Array.isArray(data.results)) {
        setSearchResults(data.results);
      } else {
        console.warn('Invalid API response:', data);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching movies:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchMovies(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMovies]);

  const addSeedMovie = (movie: Movie) => {
    if (seedMovies.length < 3 && !seedMovies.find((m) => m.id === movie.id)) {
      setSeedMovies([...seedMovies, movie]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeSeedMovie = (movieId: number) => {
    setSeedMovies(seedMovies.filter((m) => m.id !== movieId));
  };

  const handleContinueToSeeds = () => {
    if (selectedGenres.length === 0) {
      alert('Please select at least one genre');
      return;
    }
    setStep('seeds');
  };

  const handleSavePreferences = async () => {
    if (selectedGenres.length === 0) {
      alert('Please select at least one genre');
      return;
    }

    if (seedMovies.length !== 3) {
      alert('Please select exactly 3 movies you already like');
      return;
    }

    if (!roomId || typeof roomId !== 'string' || !participantIdStr) return;

    setIsSaving(true);

    try {
      // Save preferences with seed movies
      const response = await fetch(`/api/rooms/${roomId}/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: participantIdStr,
          selectedGenres,
          seedMovieIds: seedMovies.map((m) => m.id),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Check if all participants have completed preferences
        const roomResponse = await fetch(`/api/rooms/${roomId}`);
        const roomData = await roomResponse.json();
        
        if (roomData.success) {
          const allCompleted = roomData.room.participants.every(
            (p: Participant) => p.hasCompletedPreferences
          );

          if (allCompleted && roomData.room.movieList.length === 0) {
            // Generate recommendations
            await generateRecommendations();
          } else {
            // Navigate to room lobby
            router.push(`/room/${roomId}?participantId=${participantIdStr}`);
          }
        }
      } else {
        alert(data.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const generateRecommendations = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/generate-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        // Navigate to room lobby where users can start swiping
        router.push(`/room/${roomId}?participantId=${participantIdStr}`);
      } else {
        alert(data.error || 'Failed to generate recommendations');
        router.push(`/room/${roomId}?participantId=${participantIdStr}`);
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert('Failed to generate recommendations');
      router.push(`/room/${roomId}?participantId=${participantIdStr}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'genres' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
            }`}>
              1
            </div>
            <div className="w-12 h-1 bg-white/20"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'seeds' ? 'bg-blue-600 text-white' : 'bg-white/20 text-white'
            }`}>
              2
            </div>
          </div>
        </div>

        {/* Step 1: Genre Selection */}
        {step === 'genres' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
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

            {/* Continue Button */}
            <button
              onClick={handleContinueToSeeds}
              disabled={selectedGenres.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Movie Selection
            </button>
          </div>
        )}

        {/* Step 2: Seed Movie Selection */}
        {step === 'seeds' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
            <button
              onClick={() => setStep('genres')}
              className="text-blue-300 hover:text-blue-200 mb-4 text-sm"
            >
              ← Back to Genres
            </button>
            
            <h1 className="text-2xl font-bold text-white mb-2">Pick 3 Movies You Like</h1>
            <p className="text-blue-200 text-sm mb-6">
              Help us understand your taste by selecting 3 movies you already enjoy
            </p>

            {/* Selected Seed Movies */}
            {seedMovies.length > 0 && (
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3">
                  Your Picks ({seedMovies.length}/3)
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {seedMovies.map((movie) => (
                    <div key={movie.id} className="relative group">
                      <img
                        src={getPosterUrl(movie.poster_path, 'w200')}
                        alt={movie.title}
                        className="w-full rounded-lg"
                      />
                      <button
                        onClick={() => removeSeedMovie(movie.id)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <p className="text-white text-xs mt-1 truncate">{movie.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Box */}
            {seedMovies.length < 3 && (
              <div className="mb-6">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a movie..."
                  className="w-full bg-white/20 text-white placeholder-blue-200 border border-white/30 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                
                {/* Search Results */}
                {isSearching && (
                  <div className="mt-3 text-white text-sm">Searching...</div>
                )}
                
                {searchResults.length > 0 && (
                  <div className="mt-3 max-h-96 overflow-y-auto space-y-2">
                    {searchResults.map((movie) => (
                      <button
                        key={movie.id}
                        onClick={() => addSeedMovie(movie)}
                        className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-lg p-3 transition-colors text-left"
                      >
                        <img
                          src={getPosterUrl(movie.poster_path, 'w200')}
                          alt={movie.title}
                          className="w-12 h-18 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-white font-semibold">{movie.title}</p>
                          <p className="text-blue-200 text-sm">
                            {movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSavePreferences}
              disabled={isSaving || seedMovies.length !== 3}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : `Complete Setup (${seedMovies.length}/3 movies)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

