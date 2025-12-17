/**
 * Swipeable Movie Card Component
 * 
 * A mobile-friendly card component with swipe gestures:
 * - Swipe Left → Discard
 * - Swipe Right → Maybe
 * - Double-Tap → Liked
 * 
 * Uses Framer Motion for smooth animations and gesture detection.
 */

import { useState, useRef } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Movie } from '@/types';
import { getPosterUrl } from '@/lib/utils';

interface SwipeableMovieCardProps {
  movie: Movie;
  onSwipe: (vote: 'liked' | 'maybe' | 'discarded') => void;
  index: number;
}

export default function SwipeableMovieCard({
  movie,
  onSwipe,
  index,
}: SwipeableMovieCardProps) {
  const [isDoubleTapping, setIsDoubleTapping] = useState(false);
  const lastTapRef = useRef<number>(0);
  const doubleTapDelay = 300; // ms

  // Motion values for drag animation
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Handle double-tap for "Liked"
  const handleDoubleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < doubleTapDelay) {
      setIsDoubleTapping(true);
      onSwipe('liked');
      
      // Reset after animation
      setTimeout(() => {
        setIsDoubleTapping(false);
      }, 500);
    }

    lastTapRef.current = now;
  };

  // Handle drag end (swipe left or right)
  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100; // Minimum distance to trigger swipe

    if (info.offset.x > threshold) {
      // Swiped right → Maybe
      // Animate card off screen
      x.set(500);
      setTimeout(() => onSwipe('maybe'), 200);
    } else if (info.offset.x < -threshold) {
      // Swiped left → Discard
      // Animate card off screen
      x.set(-500);
      setTimeout(() => onSwipe('discarded'), 200);
    } else {
      // Didn't swipe far enough, snap back
      x.set(0);
    }
  };

  // Get release year from date
  const releaseYear = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : 'N/A';

  return (
    <motion.div
      style={{
        x,
        rotate,
        opacity,
        zIndex: 100 - index, // Stack cards
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      onTap={handleDoubleTap}
      className="absolute w-full max-w-sm mx-auto cursor-grab active:cursor-grabbing"
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Movie Poster */}
        <div className="relative aspect-[2/3] bg-gray-200">
          <img
            src={getPosterUrl(movie.poster_path, 'w500')}
            alt={movie.title}
            className="w-full h-full object-cover"
            draggable={false}
          />
          
          {/* Double-tap overlay */}
          {isDoubleTapping && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="absolute inset-0 bg-green-500/50 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-6xl"
              >
                ❤️
              </motion.div>
            </motion.div>
          )}

          {/* Swipe indicators */}
          <motion.div
            style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
            className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded-full font-bold text-lg"
          >
            DISCARD
          </motion.div>
          <motion.div
            style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
            className="absolute top-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-full font-bold text-lg"
          >
            MAYBE
          </motion.div>
        </div>

        {/* Movie Info */}
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{movie.title}</h2>
          <div className="flex items-center gap-4 text-gray-600 mb-4">
            <span className="flex items-center gap-1">
              <span className="text-yellow-500">⭐</span>
              {movie.vote_average.toFixed(1)}
            </span>
            <span>{releaseYear}</span>
          </div>
          {movie.overview && (
            <p className="text-gray-700 text-sm line-clamp-3">{movie.overview}</p>
          )}
        </div>

        {/* Instructions */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <span>👈</span>
              <span>Discard</span>
            </div>
            <div className="flex items-center gap-1">
              <span>👉</span>
              <span>Maybe</span>
            </div>
            <div className="flex items-center gap-1">
              <span>👆👆</span>
              <span>Like</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

