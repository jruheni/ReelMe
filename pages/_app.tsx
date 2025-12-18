/**
 * Next.js App Component
 * 
 * Global app wrapper with Tailwind CSS styles.
 */

import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  const isRoomRoute = router.pathname.startsWith('/room/');
  const roomId =
    typeof router.query.roomId === 'string'
      ? router.query.roomId
      : Array.isArray(router.query.roomId)
      ? router.query.roomId[0]
      : null;

  const handleLeaveRoom = async () => {
    if (!roomId) {
      router.push('/');
      return;
    }

    let participantId: string | null = null;
    try {
      participantId =
        window.localStorage.getItem(`participant_${roomId}`) || null;
    } catch (e) {
      console.error('Error reading participant from localStorage', e);
    }

    try {
      await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participantId }),
      });
    } catch (e) {
      console.error('Error leaving room from header', e);
    }

    try {
      window.localStorage.removeItem(`participant_${roomId}`);
      window.localStorage.removeItem(`room_${roomId}`);
    } catch (e) {
      console.error('Error clearing room data from localStorage', e);
    }

    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Persistent Header */}
      <header className="w-full border-b border-white/10 bg-black/40 backdrop-blur-xl z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-white tracking-tight">
              ReelMe
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {isRoomRoute && roomId && (
              <button
                onClick={handleLeaveRoom}
                className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-red-600/90 hover:bg-red-700 text-white font-semibold"
              >
                Leave Room
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1">
        <Component {...pageProps} />
      </main>
    </div>
  );
}

