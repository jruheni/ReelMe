/**
 * Quick View Modal Component
 * 
 * Lightweight modal for showing brief movie details during swiping.
 * Triggered by long-press gesture on movie cards.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Movie } from '@/types';
import { getPosterUrl } from '@/lib/utils';
import { GENRES } from '@/types';

interface QuickViewModalProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickViewModal({ movie, isOpen, onClose }: QuickViewModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Get genre names from IDs
  const genreNames = movie.genre_ids
    ?.map((id) => GENRES[id])
    .filter(Boolean)
    .slice(0, 3) || [];

  const releaseYear = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : 'N/A';

  // Truncate overview to 2 sentences
  const truncatedOverview = movie.overview
    ? movie.overview.split('. ').slice(0, 2).join('. ') + (movie.overview.split('. ').length > 2 ? '...' : '')
    : 'No description available.';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-view-title"
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-neutral-900 rounded-t-3xl md:rounded-3xl w-full max-w-md mx-4 mb-0 md:mb-4 shadow-2xl pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag indicator for mobile */}
              <div className="md:hidden flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-white/30 rounded-full"></div>
              </div>

              {/* Content */}
              <div className="relative max-h-[80vh] overflow-hidden">
                {/* Poster Background */}
                <div className="relative w-full aspect-[2/3] md:aspect-[3/4]">
                  <img
                    src={getPosterUrl(movie.poster_path, 'w500')}
                    alt={movie.title}
                    className="absolute inset-0 w-full h-full object-cover z-0"
                  />
                  
                  {/* Dark gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10"></div>
                  
                  {/* Text content overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6 z-20">
                    {/* Title and Year */}
                    <h2
                      id="quick-view-title"
                      className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight drop-shadow-lg"
                    >
                      {movie.title}
                    </h2>
                    
                    {/* Meta info row */}
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <span className="text-white/90 text-sm font-medium">{releaseYear}</span>
                      
                      {/* Rating */}
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400 text-base">⭐</span>
                        <span className="text-white font-semibold text-sm">
                          {movie.vote_average.toFixed(1)}
                        </span>
                      </div>
                      
                      {/* Runtime */}
                      {movie.runtime && (
                        <span className="text-white/90 text-sm">
                          {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                        </span>
                      )}
                    </div>

                    {/* Genre Tags */}
                    {genreNames.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {genreNames.map((genre) => (
                          <span
                            key={genre}
                            className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs font-medium"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Overview - line clamped for readability */}
                    <p className="text-white text-sm md:text-base leading-relaxed line-clamp-4 drop-shadow-md">
                      {truncatedOverview}
                    </p>

                    {/* Close hint */}
                    <p className="text-center text-white/60 text-xs mt-4">
                      Release to close • Swipe down to dismiss
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
