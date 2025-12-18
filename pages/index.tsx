/**
 * Home Page
 *
 * Apple-style scroll-driven storytelling with fade animations
 * that transitions into the functional landing page with Join/Create room.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetStaticProps } from 'next';
import PosterMarquee from '@/components/PosterMarquee';
import { fetchTrendingPosters } from '@/lib/tmdb';

const storyContent = [
  {
    type: 'hero',
    title: 'Hey Dill',
    subtitle: 'Happy Five Month Anniversary! 🎉',
  },

  {
    type: 'feature',
    title: 'So…..',
    description:
      'As much as we love watching movies together, we somehow spend half the time just trying to decide what to watch.',
  },

  {
    type: 'feature',
    title: 'It always starts the same way',
    description:
      '"What are you in the mood for?" → "I don’t know, you pick" → 30 minutes later, we’re still scrolling.',
  },

  {
    type: 'feature',
    title: 'And somehow…',
    description:
      'We’ve both said no to every movie on Netflix, even though we definitely want to watch something.',
  },

  {
    type: 'feature',
    title: 'So I built something',
    description:
      'A tiny experience where we swipe through movies, react honestly, and let the decision make itself.',
  },

  {
    type: 'feature',
    title: 'No pressure. No endless scrolling.',
    description:
      'We create a room, select the genres you want, and add 3 films youre feeling at the moment',
  },

  {
    type: 'feature',
    title: 'And then',
    description:
      'It works just like Tinder, swipe left for no, right for maybe, and double-tap for like.',
  },

  {
    type: 'cta',
    title: 'Ready to pick a movie?',
    description:
      'Let’s stop scrolling and start watching ❤️',
    primaryAction: {
      label: 'Create a Room',
      action: 'create-room',
    },
    secondaryAction: {
      label: 'Join a Room',
      action: 'join-room',
    },
  },
];


interface HomeProps {
  posters: string[];
}

export default function Home({ posters }: HomeProps) {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [expectedParticipants, setExpectedParticipants] = useState<number>(2);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expectedParticipants,
        }),
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

  useEffect(() => {
    // Add scroll animation class to body
    document.body.classList.add('scroll-animations-enabled');
    return () => document.body.classList.remove('scroll-animations-enabled');
  }, []);

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="fullscreen-section hero-section">
        <div className="fade-in-content">
          <h1 className="hero-title">
            {storyContent[0].title}
            <br />
            <span className="hero-subtitle">{storyContent[0].subtitle}</span>
          </h1>
        </div>
      </section>

      {/* Story Sections */}
      <section className="story-section">
        <div className="story-grid">
          {storyContent.slice(1).map((item, idx) => (
            <div key={idx} className="story-item">
              <h2 className="story-title">{item.title}</h2>
              <p className="story-description">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final functional landing section */}
      <section className="fullscreen-section landing-section">
        {/* Poster Marquee Background */}
        {posters.length > 0 && <PosterMarquee posters={posters} />}
        
        <div className="landing-content relative z-10">
          <div className="landing-header">
            <h1 className="landing-title">ReelMe</h1>
            <p className="landing-subtitle">Find a movie everyone agrees on.</p>
          </div>

          <div className="landing-cards">
            {/* Join a Room */}
            <div className="landing-card">
              <h2 className="text-xl font-semibold mb-2">Join a Room</h2>
              <form onSubmit={handleJoinRoom} className="space-y-3">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code (e.g., ABC123)"
                  maxLength={6}
                  className="w-full bg-white/10 text-white placeholder-blue-200 border border.white/30 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Join Room
                </button>
              </form>
            </div>

            {/* Create a Room */}
            <div className="landing-card landing-card-alt">
              <h2 className="text-xl font-semibold mb-2">Create a Room</h2>
              <label className="block text-sm text-blue-200 mb-2">
                Expected number of participants
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={expectedParticipants}
                onChange={(e) =>
                  setExpectedParticipants(
                    Math.min(5, Math.max(1, Number(e.target.value) || 1))
                  )
                }
                className="w-full bg-white/10 text-white placeholder-blue-200 border border-white/30 rounded-lg py-2 px-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create New Room'}
              </button>
            </div>
          </div>
        </div>
        {/* Footer */}
        <footer className="landing-footer">
          <p>ReelMe · Built for movie nights</p>
        </footer>
      </section>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  try {
    const posters = await fetchTrendingPosters();
    return {
      props: {
        posters,
      },
      revalidate: 86400, // Revalidate once per day
    };
  } catch (error) {
    console.error('Error fetching posters:', error);
    return {
      props: {
        posters: [],
      },
    };
  }
};

