/**
 * seed-photos.ts — populate the `photos` table with placeholder images.
 *
 * BEHAVIOR
 *   Default mode:  npx tsx scripts/seed-photos.ts
 *     Downloads the hardcoded Unsplash URLs below, uploads each file to
 *     Supabase Storage under the `photos` bucket, then inserts an approved
 *     `photos` row pointing at the public URL.
 *
 *   Directory mode:  npx tsx scripts/seed-photos.ts ./path/to/local-photos
 *     Uploads every *.jpg / *.jpeg / *.png / *.webp in the given directory
 *     instead of the Unsplash defaults.  Use this when Scott has real photos.
 *
 * IDEMPOTENCY
 *   If a file already exists at the storage path it is OVERWRITTEN (upsert).
 *   Duplicate DB rows are avoided by checking image_url before inserting.
 *
 * YEAR-FOLDER CONVENTION
 *   All files are stored under  {year}/{filename}  inside the `photos` bucket.
 *   E.g.  photos/2024/golf-course-morning.jpg
 *   When Scott supplies real photos for a different year, pass --year=2025 (env
 *   var SEED_YEAR) or just update the constant below.
 *
 * REQUIRED ENV (read from .env.local)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← service-role key, never the anon key
 *
 * NEVER run this in an automated CI pipeline — it is a local one-off script.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Load env from .env.local (next/env is not available in plain Node scripts)
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Missing .env.local — copy .env.example and fill in values");
    process.exit(1);
  }
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SEED_YEAR = parseInt(process.env.SEED_YEAR ?? "2024", 10);
const BUCKET = "photos";

// ---------------------------------------------------------------------------
// Curated Unsplash placeholder photos
//
// Selection criteria: golf courses and outdoor community-gathering scenes.
// Colors lean toward greens and soft neutrals to complement the teal brand.
// All are landscape-format, 1920px wide, no stock-photo cheese, no alcohol.
// Unsplash license: free for commercial use, no attribution required.
// https://unsplash.com/license
// ---------------------------------------------------------------------------
const UNSPLASH_PHOTOS: { url: string; filename: string; caption: string }[] = [
  {
    // Wide fairway framed by pine trees — classic morning light
    url: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1920&q=85&fm=jpg",
    filename: "golf-fairway-morning.jpg",
    caption: "Morning light on the fairway",
  },
  {
    // Golfer at address, soft-focus green behind — dignified action shot
    url: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=1920&q=85&fm=jpg",
    filename: "golfer-at-address.jpg",
    caption: "Ready to play",
  },
  {
    // Elevated view of a pristine putting green with flag
    url: "https://images.unsplash.com/photo-1599474924187-334a4ae5bd3b?w=1920&q=85&fm=jpg",
    filename: "putting-green-aerial.jpg",
    caption: "The 18th green",
  },
  {
    // Golf cart path winding through lush course — community feel
    url: "https://images.unsplash.com/photo-1611374243147-44a702c2d44c?w=1920&q=85&fm=jpg",
    filename: "cart-path-course.jpg",
    caption: "Between holes",
  },
  {
    // Sunset over a golf course — warm and reflective
    url: "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=1920&q=85&fm=jpg",
    filename: "course-sunset.jpg",
    caption: "End of a great day on the course",
  },
  {
    // Golfers in a group conversation at the clubhouse exterior
    url: "https://images.unsplash.com/photo-1632553929167-fd8cedddc9e8?w=1920&q=85&fm=jpg",
    filename: "group-at-clubhouse.jpg",
    caption: "Tournament participants gathering",
  },
  {
    // Tee box overlooking water hazard — scenic, aspirational
    url: "https://images.unsplash.com/photo-1510562838aadc-78e6fdd5a82e?w=1920&q=85&fm=jpg",
    filename: "tee-box-water.jpg",
    caption: "Tee shot over the water",
  },
  {
    // Close-up of golf bag and clubs — equipment detail
    url: "https://images.unsplash.com/photo-1592919505780-303950717480?w=1920&q=85&fm=jpg",
    filename: "golf-bag-detail.jpg",
    caption: "Geared up and ready",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

function mimeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return map[ext] ?? "image/jpeg";
}

async function upsertPhoto(
  fileBuffer: Buffer,
  filename: string,
  caption: string
) {
  const storagePath = `${SEED_YEAR}/${filename}`;
  const contentType = mimeFromFilename(filename);

  // Upload to Storage (upsert = overwrite if exists)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, { contentType, upsert: true });

  if (uploadError) {
    throw new Error(`Storage upload failed for ${filename}: ${uploadError.message}`);
  }

  // Build public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);
  const imageUrl = urlData.publicUrl;

  // Skip DB insert if URL already in table (prevents duplicate rows on re-run)
  const { data: existing } = await supabase
    .from("photos")
    .select("id")
    .eq("image_url", imageUrl)
    .maybeSingle();

  if (existing) {
    console.log(`  skip DB insert (already exists): ${filename}`);
    return;
  }

  const { error: dbError } = await supabase.from("photos").insert({
    uploaded_by_name: "Seed Script",
    uploaded_by_email: null,
    image_url: imageUrl,
    caption,
    status: "approved",
    year: SEED_YEAR,
  });

  if (dbError) {
    throw new Error(`DB insert failed for ${filename}: ${dbError.message}`);
  }

  console.log(`  inserted: ${filename}`);
}

// ---------------------------------------------------------------------------
// Default mode: download Unsplash URLs
// ---------------------------------------------------------------------------
async function seedFromUnsplash() {
  console.log(`Seeding ${UNSPLASH_PHOTOS.length} Unsplash placeholder photos (year=${SEED_YEAR})...`);
  for (const photo of UNSPLASH_PHOTOS) {
    process.stdout.write(`  fetching ${photo.filename} ... `);
    try {
      const buf = await fetchImageBuffer(photo.url);
      process.stdout.write(`${Math.round(buf.length / 1024)}KB `);
      await upsertPhoto(buf, photo.filename, photo.caption);
    } catch (err) {
      console.error(`\n  ERROR: ${(err as Error).message}`);
    }
  }
  console.log("Done.");
}

// ---------------------------------------------------------------------------
// Directory mode: upload local files
// ---------------------------------------------------------------------------
async function seedFromDirectory(dir: string) {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs)) {
    console.error(`Directory not found: ${abs}`);
    process.exit(1);
  }
  const files = fs
    .readdirSync(abs)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

  if (files.length === 0) {
    console.error(`No image files found in ${abs}`);
    process.exit(1);
  }

  console.log(`Seeding ${files.length} files from ${abs} (year=${SEED_YEAR})...`);
  for (const file of files) {
    process.stdout.write(`  reading ${file} ... `);
    try {
      const buf = fs.readFileSync(path.join(abs, file));
      process.stdout.write(`${Math.round(buf.length / 1024)}KB `);
      await upsertPhoto(buf, file, "");
    } catch (err) {
      console.error(`\n  ERROR: ${(err as Error).message}`);
    }
  }
  console.log("Done.");
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
const [, , arg] = process.argv;

if (arg) {
  seedFromDirectory(arg).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  seedFromUnsplash().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
