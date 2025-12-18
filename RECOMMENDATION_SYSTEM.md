# ReelMe Recommendation System

## Overview

ReelMe uses a **content-based recommendation system** that generates personalized movie suggestions based on user preferences and seed movies. The system is designed to work immediately upon room creation, without requiring historical data or collaborative filtering.

## System Architecture

### 1. User Onboarding Flow

When a user joins a room, they complete a two-step preference setup:

#### Step 1: Genre Selection
- Users select one or more movie genres they enjoy
- These become **explicit preferences** with high weight in recommendations

#### Step 2: Seed Movie Selection
- Users search for and select **exactly 3 movies** they already like
- These provide **implicit preferences** through:
  - Genre associations
  - Keywords and themes
  - Runtime preferences
  - Release year patterns
  - Quality expectations (rating)

### 2. Preference Profile Construction

For each user, the system builds a `PreferenceProfile`:

```typescript
interface PreferenceProfile {
  genreScores: { [genreId: number]: number };  // Weighted genre preferences
  keywords: string[];                           // Common keywords from seed movies
  preferredRuntime: number;                     // Average runtime
  preferredYearRange: [number, number];         // Min/max release years
  minRating: number;                            // Minimum acceptable rating
}
```

#### Scoring Logic

**Genre Scores:**
- Explicitly selected genres: **10 points**
- Genres from seed movies: **5 points** (or +3 if already selected)

**Keywords:**
- Extracted from TMDB movie keywords
- Only keywords appearing in **2+ seed movies** are kept
- Used for thematic matching

**Runtime:**
- Average of seed movie runtimes
- Used to prefer similar-length films

**Year Range:**
- Based on seed movie release years
- Extended by ±5 years for flexibility

**Minimum Rating:**
- Average seed rating minus 1.5 points
- Floor of 6.0 to maintain quality

### 3. Candidate Movie Retrieval

The system fetches candidate movies using TMDB's Discover API:

```typescript
// Filters applied:
- Top 5 genres from preference profile
- Minimum vote count: 300
- Minimum rating: user's minRating
- Release year range: user's preferredYearRange
- Fetches 200-300 movies for scoring
```

### 4. Movie Scoring Algorithm

Each candidate movie is scored across 5 dimensions:

```typescript
function scoreMovie(movie: Movie, profile: PreferenceProfile): number {
  let score = 0;
  
  // 1. Genre Match (up to 30 points)
  score += weightedGenreScore(movie, profile.genreScores);
  
  // 2. Runtime Similarity (up to 10 points)
  score += 10 - (abs(movie.runtime - profile.preferredRuntime) / 10);
  
  // 3. Release Year Proximity (up to 10 points)
  score += 10 - (abs(movieYear - midYear) / 5);
  
  // 4. Rating Bonus (up to 10 points)
  score += (movie.vote_average - profile.minRating) * 2;
  
  // 5. Popularity Bonus (up to 5 points)
  score += min(movie.popularity / 100, 5);
  
  return score;
}
```

**Total possible score: ~65 points**

### 5. Group Recommendations

When all participants complete preferences, the system aggregates profiles:

```typescript
// Aggregation strategy:
1. Average genre scores across all users
2. Keep keywords mentioned by ≥50% of users
3. Average runtime preferences
4. Use widest year range (min of mins, max of maxes)
5. Average minimum rating requirements
```

This ensures recommendations satisfy the **entire group**, not just one person.

## API Endpoints

### Save User Preferences
```
POST /api/rooms/[roomId]/preferences

Body:
{
  "participantId": "participant_123",
  "selectedGenres": [28, 878, 53],
  "seedMovieIds": [603, 157336, 27205]
}

Response:
{
  "success": true,
  "userPreferences": { ... }
}
```

### Generate Group Recommendations
```
POST /api/rooms/[roomId]/generate-recommendations

Response:
{
  "success": true,
  "movieCount": 150,
  "message": "Recommendations generated successfully"
}
```

## Data Storage (Firestore)

### Room Document Structure
```typescript
{
  roomId: "ABC123",
  participants: [
    {
      id: "participant_123",
      nickname: "Alice",
      genres: [28, 878],
      hasCompletedPreferences: true
    }
  ],
  userPreferences: {
    "participant_123": {
      participantId: "participant_123",
      selectedGenres: [28, 878, 53],
      seedMovies: [
        {
          id: 603,
          title: "The Matrix",
          genre_ids: [28, 878],
          keywords: ["dystopia", "artificial intelligence"],
          runtime: 136,
          release_year: 1999,
          vote_average: 8.2
        },
        // ... 2 more seed movies
      ],
      profile: {
        genreScores: { 28: 13, 878: 13, 53: 10 },
        keywords: ["dystopia", "future"],
        preferredRuntime: 130,
        preferredYearRange: [1994, 2024],
        minRating: 7.0
      }
    }
  },
  movieList: [ /* Ranked recommendations */ ],
  recommendationScores: {
    "550": 45.2,
    "13": 42.8,
    // ...
  }
}
```

## Key Features

### Immediate Intelligence
- Works from the first interaction
- No cold start problem
- No historical data required

### Explainable
- Every score is deterministic
- Users can understand why movies were recommended
- No black-box ML

### Group-Aware
- Aggregates preferences fairly
- Finds movies that satisfy everyone
- Respects individual tastes

### Async-Friendly
- Each user completes preferences independently
- Recommendations generated when all are ready
- No real-time coordination needed

### Performant
- Runs entirely on serverless functions
- Caches results in Firestore
- Mobile-optimized

## Future Enhancements

### Phase 2: Swipe Learning
```typescript
// As users swipe, update preference weights:
- Liked movies → boost similar genres/keywords
- Discarded movies → reduce similar genres/keywords
- Track patterns in user behavior
```

### Phase 3: Collaborative Filtering
```typescript
// "Users who liked X also liked Y"
- Build user similarity matrix
- Recommend based on similar users' likes
- Hybrid approach: content + collaborative
```

### Phase 4: Embeddings
```typescript
// Use ML embeddings for semantic similarity
- Movie plot embeddings
- Visual style embeddings
- Director/actor embeddings
```

## Testing the System

### Manual Test Flow

1. **Create a room**
   ```
   POST /api/rooms/create
   { expectedParticipants: 2 }
   ```

2. **Join as participant 1**
   - Select genres: Action, Sci-Fi
   - Select seed movies: The Matrix, Inception, Blade Runner 2049

3. **Join as participant 2**
   - Select genres: Sci-Fi, Thriller
   - Select seed movies: Interstellar, Arrival, Ex Machina

4. **Generate recommendations**
   - System should return movies like:
     - Tenet
     - Edge of Tomorrow
     - Minority Report
     - Looper
     - Source Code

### Validation

Check that recommendations:
- Match selected genres
- Have similar themes to seed movies
- Fall within expected runtime range
- Meet quality thresholds
- Are ranked by relevance score

## Performance Metrics

- **Preference save time**: ~2-3 seconds (fetches 3 movie details)
- **Recommendation generation**: ~5-8 seconds (fetches 200-300 candidates)
- **Total onboarding time**: ~30-60 seconds per user
- **Memory usage**: Minimal (stateless functions)

## Error Handling

The system gracefully handles:
- Missing TMDB data (uses defaults)
- API failures (retries with fallbacks)
- Incomplete preferences (validates before saving)
- Network issues (shows user-friendly errors)

## Conclusion

This recommendation system provides **immediate, explainable, and group-aware** movie suggestions without requiring machine learning infrastructure or historical data. It's designed to scale with ReelMe's growth and can be enhanced incrementally as more data becomes available.
