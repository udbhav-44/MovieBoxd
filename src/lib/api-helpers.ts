import { getSettings } from "./storage";
import {
  extractMovieFields,
  getMovieDetails,
  searchMovies,
  TmdbError,
} from "./tmdb";

export { extractMovieFields, getMovieDetails, searchMovies, TmdbError };

export async function getSettingsSafe() {
  return getSettings();
}

export function errorResponse(error: unknown, fallback = "Unexpected error") {
  if (error instanceof TmdbError) {
    return { error: error.message, status: error.status };
  }
  if (error instanceof Error) {
    return { error: error.message, status: 500 };
  }
  return { error: fallback, status: 500 };
}
