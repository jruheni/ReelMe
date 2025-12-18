/**
 * Watchlist View Page
 * 
 * Displays the compiled watchlist of all "liked" and "maybe" movies
 * from all participants. Shows movie details and allows sorting.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Room, Movie, Votes } from '@/types';
import { getPosterUrl } from '@/lib/utils';
import Link from 'next/link';

type SortOption = 'rating' | 'recency' | 'title';

interface MovieDetails {
  id: number;
  title: string;
  overview: string;
  runtime: number | null;
  release_date: string;
  vote_average: number;
  poster_path: string | null;
  trailerUrl?: string | null;
}

interface ManualAddMovieProps {
  roomId: string;
  onRoomUpdated: (room: Room | null) => void;
}

function ManualAddMovie({ roomId, onRoomUpdated }: ManualAddMovieProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<
    { id: number; title: string; release_date?: string; poster_path?: string | null; vote_average?: number }[]
  >([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!roomId || !q) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/search-movies?query=${encodeURIComponent(q)}`
      );
      const data = await response.json();
      if (data.success) {
        setResults(data.results || []);
        setShowResults(true);
      } else {
        alert(data.error || 'Failed to search movies');
      }
    } catch (error) {
      console.error('Error searching movies:', error);
      alert('Failed to search movies');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = async (movieId: number) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/add-movie`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ movieId }),
      });
      const data = await response.json();
      if (data.success) {
        onRoomUpdated(data.room);
        setShowResults(false);
        setResults([]);
        setQuery('');
      } else {
        alert(data.error || 'Failed to add movie');
      }
    } catch (error) {
      console.error('Error adding movie manually:', error);
      alert('Failed to add movie');
    }
  };

  return (
    <>
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 text-xs md:text-sm"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Add movie by title"
          className="w-40 md:w-52 bg-white/10 text-white placeholder-blue-200 border border-white/20 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 text-xs md:text-sm"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {showResults && results.length > 0 && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
          <div className="bg-neutral-900 rounded-3xl max-w-lg w-full mx-4 p-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">
                Select a movie to add
              </h2>
              <button
                onClick={() => setShowResults(false)}
                className="text-blue-200 hover:text-white text-xs"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {results.map((m) => {
                const year = m.release_date
                  ? new Date(m.release_date).getFullYear()
                  : 'N/A';
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelect(m.id)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 text-left"
                  >
                    <div className="w-10 h-14 bg-gray-800 overflow-hidden rounded-md flex-shrink-0">
                      {m.poster_path && (
                        <img
                          src={getPosterUrl(m.poster_path, 'w200')}
                          alt={m.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-semibold line-clamp-1">
                        {m.title}
                      </p>
                      <p className="text-blue-200 text-xs">
                        {year}{' '}
                        {typeof m.vote_average === 'number'
                          ? `· ⭐ ${m.vote_average.toFixed(1)}`
                          : ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function WatchlistPage() {
  const router = useRouter();
  const { roomId, participantId } = router.query;
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const likeMeta: {
    [movieId: number]: { likeCount: number; likedBy: string[] };
  } = {};

  if (room && room.votes) {
    const votes: Votes = room.votes;
    Object.entries(votes).forEach(([participantId, participantVotes]) => {
      const participant = room.participants.find(
        (p) => p.id === participantId
      );
      const name = participant?.nickname || 'Unknown';

      Object.entries(participantVotes).forEach(([movieIdStr, voteType]) => {
        if (voteType === 'liked') {
          const id = Number(movieIdStr);
          if (!likeMeta[id]) {
            likeMeta[id] = { likeCount: 0, likedBy: [] };
          }
          likeMeta[id].likeCount += 1;
          if (!likeMeta[id].likedBy.includes(name)) {
            likeMeta[id].likedBy.push(name);
          }
        }
      });
    });
  }

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

  const openDetails = async (movie: Movie) => {
    setSelectedMovie(movie);
    setMovieDetails(null);
    setIsDetailsLoading(true);

    try {
      const response = await fetch(`/api/movies/${movie.id}`);
      const data = await response.json();

      if (data.success) {
        setMovieDetails({
          ...data.movie,
          trailerUrl: data.trailerUrl,
        });
      }
    } catch (error) {
      console.error('Error loading movie details:', error);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedMovie(null);
    setMovieDetails(null);
    setIsDetailsLoading(false);
  };

  const formatRuntime = (runtime: number | null) => {
    if (!runtime || runtime <= 0) return 'N/A';
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  // Sort watchlist
  const sortedWatchlist = room?.watchlist ? [...room.watchlist].sort((a, b) => {
    const aMeta = likeMeta[a.id] || { likeCount: 0, likedBy: [] };
    const bMeta = likeMeta[b.id] || { likeCount: 0, likedBy: [] };

    // Primary sort: most likes first
    if (aMeta.likeCount !== bMeta.likeCount) {
      return bMeta.likeCount - aMeta.likeCount;
    }

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading watchlist...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 pb-24">
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

          {/* Sort Options & Manual Add */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4">
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
            <ManualAddMovie
              roomId={roomId as string}
              onRoomUpdated={setRoom}
            />
          </div>

          <p className="text-blue-200 text-sm mt-4">
            {sortedWatchlist.length} movie
            {sortedWatchlist.length !== 1 ? 's' : ''} in watchlist
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
            {sortedWatchlist.map((movie) => {
              const releaseYear = movie.release_date
                ? new Date(movie.release_date).getFullYear()
                : 'N/A';

              return (
                <button
                  key={movie.id}
                  onClick={() => openDetails(movie)}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden hover:bg-white/20 transition-transform transform hover:scale-105 text-left"
                >
                  <div className="aspect-[2/3] bg-gray-900">
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
                    <div className="flex items-center justify-between text-xs text-blue-200 mb-1">
                      <span className="flex items-center gap-1">
                        <span>⭐</span>
                        {movie.vote_average.toFixed(1)}
                      </span>
                      <span>{releaseYear}</span>
                    </div>
                    {likeMeta[movie.id]?.likeCount > 0 && (
                      <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-600/80 text-[11px] text-white font-medium">
                        <span>❤️</span>
                        <span>
                          {likeMeta[movie.id].likeCount} like
                          {likeMeta[movie.id].likeCount !== 1 ? 's' : ''} by{' '}
                          {likeMeta[movie.id].likedBy.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
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

        {/* Movie Details Modal */}
        {selectedMovie && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-neutral-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/3 bg-black flex-shrink-0 relative overflow-hidden">
                  <div className="aspect-[2/3] md:min-h-[400px] relative">
                    <img
                      src={getPosterUrl(selectedMovie.poster_path, 'w500')}
                      alt={selectedMovie.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Gradient overlay for smooth transition to text on desktop */}
                    <div className="hidden md:block absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent via-neutral-900/50 to-neutral-900 pointer-events-none"></div>
                  </div>
                </div>
                <div className="md:w-2/3 p-5 md:p-6 md:pl-8 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                        {selectedMovie.title}
                      </h2>
                      <div className="flex items-center gap-3 text-sm text-blue-200">
                        <span className="flex items-center gap-1">
                          <span>⭐</span>
                          {selectedMovie.vote_average.toFixed(1)}
                        </span>
                        <span>
                          {selectedMovie.release_date
                            ? new Date(
                                selectedMovie.release_date
                              ).getFullYear()
                            : 'N/A'}
                        </span>
                        {movieDetails && (
                          <span>{formatRuntime(movieDetails.runtime)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={closeDetails}
                      className="text-blue-200 hover:text-white text-sm"
                    >
                      Close
                    </button>
                  </div>

                  <div className="text-sm text-gray-200 pr-1">
                    {isDetailsLoading && <p>Loading details...</p>}
                    {!isDetailsLoading && (
                      <p>
                        {movieDetails?.overview ||
                          selectedMovie.overview ||
                          'No synopsis available.'}
                      </p>
                    )}
                  </div>

                  {movieDetails && (
                    <>
                      {movieDetails.runtime && (
                        <p className="text-xs text-blue-300 mb-2">
                          Runtime: {formatRuntime(movieDetails.runtime)}
                        </p>
                      )}

                      {/* Trailer link (if available) */}
                      {movieDetails.trailerUrl && (
                        <div className="mt-2 flex gap-3">
                          <a
                            href={movieDetails.trailerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                          >
                            Watch Trailer
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

