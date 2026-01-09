import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "Vouchie - Stake Your Goals";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const revalidate = 86400; // Revalidate once per day

export default async function Image() {
  try {
    const publicDir = join(process.cwd(), "public");
    const thumbnailPath = join(publicDir, "thumbnail.png");
    const thumbnailBuffer = await readFile(thumbnailPath);

    return new NextResponse(new Uint8Array(thumbnailBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Error reading thumbnail file:", error);
    throw new Error("Thumbnail file not found");
  }
}
