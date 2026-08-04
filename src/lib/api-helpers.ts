import { ClaudeError } from "./claude";
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
  if (error instanceof TmdbError || error instanceof ClaudeError) {
    return { error: error.message, status: error.status };
  }
  if (error instanceof Error) {
    // Unexpected failures lose their stack once serialized to the client.
    console.error("[movieboxd] unhandled error:", error);
    return { error: error.message, status: 500 };
  }
  console.error("[movieboxd] unhandled non-error throw:", error);
  return { error: fallback, status: 500 };
}
