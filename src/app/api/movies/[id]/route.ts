import { NextResponse } from "next/server";
import { deleteMovie, updateMovie } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    rewatchable?: boolean;
    rating?: number | null;
    review?: string;
    watchedDate?: string | null;
  };

  const movie = await updateMovie(id, body);
  if (!movie) {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }
  return NextResponse.json({ movie });
}

export async function DELETE(_request: Request, context: Ctx) {
  const { id } = await context.params;
  const ok = await deleteMovie(id);
  if (!ok) {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
