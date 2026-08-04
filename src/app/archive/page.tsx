import { listMovies } from "@/lib/storage";
import { ArchiveClient } from "./ArchiveClient";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const movies = await listMovies();
  return <ArchiveClient initialMovies={movies} />;
}
