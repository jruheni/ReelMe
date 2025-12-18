/**
 * Poster Marquee Component
 * 
 * Infinite horizontal scrolling carousel of movie posters.
 * Decorative background element for the CTA section.
 * Uses CSS animations for smooth, seamless looping.
 */

import { useEffect, useState } from 'react';

interface PosterMarqueeProps {
  posters: string[]; // Array of poster paths
}

export default function PosterMarquee({ posters }: PosterMarqueeProps) {
  const [isReduced, setIsReduced] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReduced(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Duplicate posters for seamless loop
  const duplicatedPosters = [...posters, ...posters];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center">
      {/* Poster track */}
      <div
        className={`flex gap-6 ${isReduced ? '' : 'animate-marquee'}`}
        style={{
          width: 'max-content',
        }}
      >
        {duplicatedPosters.map((poster, index) => (
          <div
            key={`${poster}-${index}`}
            className="relative flex-shrink-0 w-56 sm:w-64 md:w-72 lg:w-80 xl:w-96 aspect-[2/3] rounded-xl overflow-hidden opacity-30 grayscale-[0.2]"
          >
            <img
              src={`https://image.tmdb.org/t/p/w500${poster}`}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Gradient fade overlays */}
      <div className="absolute inset-y-0 left-0 w-48 md:w-64 bg-gradient-to-r from-black via-black/80 to-transparent z-10 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-48 md:w-64 bg-gradient-to-l from-black via-black/80 to-transparent z-10 pointer-events-none"></div>
    </div>
  );
}
