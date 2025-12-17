# ReelMe - Async Movie Watchlist App

A mobile-first web application where small groups of friends (max 5 participants) can select movie genres, swipe asynchronously on curated films, and compile a shared watchlist.

## Features

- **Room Creation & Joining**: Generate unique room codes for friends to join
- **Genre Selection**: Each participant selects their preferred movie genres
- **TMDB Integration**: Fetches and ranks movies based on genre match, rating, and recency
- **Async Swiping**: 
  - Swipe Left → Discard
  - Swipe Right → Maybe
  - Double-Tap → Liked
- **Shared Watchlist**: Automatically compiles all "liked" and "maybe" votes from all participants
- **Persistent Storage**: All data stored in Firebase Firestore
- **Mobile-First Design**: Optimized for mobile devices with smooth swipe gestures

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Database**: Firebase Firestore
- **API**: TMDB (The Movie Database) API

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# TMDB API Key (get from https://www.themoviedb.org/settings/api)
NEXT_PUBLIC_TMDB_API_KEY=your-tmdb-api-key
```

### 3. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Copy your Firebase configuration values to `.env.local`
4. Set up Firestore security rules (for development, you can use test mode)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ReelMe/
├── components/          # React components
│   └── SwipeableMovieCard.tsx
├── lib/                 # Utility functions and configurations
│   ├── firebase.ts      # Firebase initialization
│   ├── tmdb.ts          # TMDB API integration
│   └── utils.ts         # Helper functions
├── pages/               # Next.js pages
│   ├── api/             # API routes
│   │   └── rooms/       # Room-related endpoints
│   ├── room/            # Room pages
│   │   └── [roomId]/    # Dynamic room routes
│   └── index.tsx        # Home page
├── styles/              # Global styles
│   └── globals.css
├── types/               # TypeScript type definitions
│   └── index.ts
└── package.json
```

## API Routes

### `POST /api/rooms/create`
Creates a new room with a unique room code.

### `GET /api/rooms/[roomId]`
Retrieves room data.

### `PUT /api/rooms/[roomId]`
Updates room data.

### `POST /api/rooms/[roomId]/join`
Adds a participant to a room.

### `POST /api/rooms/[roomId]/movies`
Fetches movies from TMDB and stores them in the room.

### `POST /api/rooms/[roomId]/vote`
Records a participant's vote for a movie.

## Database Schema

### Room Document (Firestore)

```typescript
{
  roomId: string;              // Unique room code
  createdAt: string;           // ISO timestamp
  participants: Participant[]; // Max 5 participants
  movieList: Movie[];         // Pre-ranked list of movies
  votes: {                     // Votes by participant
    [participantId]: {
      [movieId]: 'liked' | 'maybe' | 'discarded'
    }
  };
  watchlist: Movie[];         // Compiled watchlist
  preferences?: {
    genres: number[];
    mood?: string;
    era?: string;
  };
}
```

## Usage Flow

1. **Create/Join Room**: User creates a room or joins with a room code
2. **Enter Nickname**: User enters their nickname
3. **Select Genres**: User selects preferred movie genres
4. **Fetch Movies**: Once all participants have selected genres, movies are fetched from TMDB
5. **Swipe**: Participants swipe through movies independently
6. **View Watchlist**: Any participant can view the compiled watchlist at any time

## Mobile Gestures

- **Swipe Left**: Discard movie
- **Swipe Right**: Maybe (add to watchlist)
- **Double-Tap**: Like (add to watchlist)
- **Manual Buttons**: Fallback buttons available for non-swipe devices

## Future Enhancements

- Bracket-style voting
- Advanced ranking algorithms
- Mood and era filters
- Real-time updates via WebSockets
- User authentication
- Room history and saved watchlists

## License

MIT

