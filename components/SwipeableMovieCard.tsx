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

import { useState, useRef, useEffect } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Movie } from '@/types';
import { getPosterUrl } from '@/lib/utils';
import QuickViewModal from './QuickViewModal';

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
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const doubleTapDelay = 300; // ms
  const longPressDelay = 450; // ms
  const movementThreshold = 10; // pixels

  // Motion values for drag animation
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Handle double-tap for "Liked"
  const handleDoubleTap = () => {
    // Don't trigger if Quick View is open
    if (isQuickViewOpen) return;

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

  // Long press handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Don't start long press if already dragging or modal is open
    if (isDragging || isQuickViewOpen) return;

    pointerStartRef.current = { x: e.clientX, y: e.clientY };

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      setIsQuickViewOpen(true);
    }, longPressDelay);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;

    // Calculate movement distance
    const deltaX = Math.abs(e.clientX - pointerStartRef.current.x);
    const deltaY = Math.abs(e.clientY - pointerStartRef.current.y);
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // If user moved beyond threshold, cancel long press and enable dragging
    if (totalMovement > movementThreshold) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      setIsDragging(true);
      pointerStartRef.current = null;
    }
  };

  const handlePointerUp = () => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Close Quick View if it was open
    if (isQuickViewOpen) {
      setIsQuickViewOpen(false);
    }

    pointerStartRef.current = null;
    setIsDragging(false);
  };

  const handlePointerCancel = () => {
    // Clean up on pointer cancel
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartRef.current = null;
    setIsDragging(false);
  };

  // Handle drag end (swipe left or right)
  const handleDragEnd = (_: any, info: PanInfo) => {
    // Don't process swipes if Quick View is open
    if (isQuickViewOpen) {
      x.set(0);
      return;
    }

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

    setIsDragging(false);
  };

  // Handle keyboard interaction
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsQuickViewOpen(true);
    }
  };

  return (
    <>
      <motion.div
        style={{
          x,
          rotate,
          opacity,
          zIndex: 100 - index, // Stack cards
        }}
        drag={isQuickViewOpen ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        onTap={handleDoubleTap}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`${movie.title}. Press and hold for quick view, swipe left to discard, swipe right for maybe, double tap to like.`}
        className={`absolute w-full max-w-md mx-auto cursor-grab active:cursor-grabbing h-full flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl transition-opacity ${
          isQuickViewOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        whileTap={{ scale: isQuickViewOpen ? 1 : 0.95 }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: isQuickViewOpen ? 0 : 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
      <div className="relative bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden w-full h-full">
        {/* Movie Poster */}
        <div className="relative w-full h-full bg-gray-900">
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
      </div>

        {/* Info Button (Accessibility Fallback) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsQuickViewOpen(true);
          }}
          className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors z-10"
          aria-label="Show movie details"
        >
          <span className="text-sm font-bold">ⓘ</span>
        </button>
      </motion.div>

      {/* Quick View Modal */}
      <QuickViewModal
        movie={movie}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  );
}

