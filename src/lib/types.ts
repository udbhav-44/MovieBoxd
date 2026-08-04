export type MovieSource = "letterboxd" | "manual";

export interface WatchedMovie {
  id: string;
  tmdbId: number | null;
  title: string;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  genres: string[];
  themes: string[];
  actors: string[];
  directors: string[];
  runtime: number | null;
  rating: number | null;
  review: string;
  watchedDate: string | null;
  rewatchable: boolean;
  source: MovieSource;
  createdAt: string;
  updatedAt: string;
}

export type ClaudeModel =
  | "claude-sonnet-5"
  | "claude-opus-5"
  | "claude-haiku-4-5";

export interface AppSettings {
  tmdbApiKey: string;
  anthropicApiKey: string;
  claudeModel: ClaudeModel;
}

export interface AppStore {
  settings: AppSettings;
  movies: WatchedMovie[];
}

export interface TasteBucket {
  name: string;
  score: number;
  count: number;
}

export interface TasteProfile {
  totalWatched: number;
  ratedCount: number;
  avgRating: number;
  rewatchableCount: number;
  topGenres: TasteBucket[];
  topActors: TasteBucket[];
  topDirectors: TasteBucket[];
  topThemes: TasteBucket[];
  storySignals: TasteBucket[];
  ratingDistribution: Record<string, number>;
}

export type RecommendationEngine = "claude" | "heuristic";

export interface Recommendation {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  genres: string[];
  voteAverage: number;
  score: number;
  reasons: string[];
  /** Claude-written pitch for why this lands with your taste. */
  pitch?: string;
  /** Claude's confidence that this is a hit, 0–100. */
  confidence?: number;
  /** Where the pick came from when the LLM ranker is unavailable. */
  engine?: RecommendationEngine;
}

export interface TasteNarrative {
  headline: string;
  summary: string;
  lovesList: string[];
  avoidsList: string[];
  blindSpots: string[];
}

export interface TmdbMovieSummary {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  genre_ids?: number[];
  vote_average?: number;
  popularity?: number;
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  runtime?: number | null;
  genres?: { id: number; name: string }[];
  credits?: {
    cast?: { id: number; name: string; order: number }[];
    crew?: { id: number; name: string; job: string }[];
  };
  keywords?: {
    keywords?: { id: number; name: string }[];
  };
}
