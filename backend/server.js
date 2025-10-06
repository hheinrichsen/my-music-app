import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

// Create the uploads directory if it doesn't exist
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const app = express();
app.use(cors());

// Configure multer storage.  We keep the original filename but prefix it
// with a timestamp to avoid collisions.
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const ts = Date.now();
    cb(null, `${ts}__${safe}`);
  },
});
const upload = multer({ storage });

// In-memory library of tracks.  Persist to a database if needed.
let library = [];

// Helper to compute absolute URLs based on request headers.  When the server
// is behind a proxy, consider using X-Forwarded-* headers instead.
function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  return `${proto}://${req.headers.host}`;
}
function absoluteUrl(req, p) {
  const origin = getOrigin(req);
  return `${origin}${p.startsWith('/') ? p : `/${p}`}`;
}

// Serve the uploaded files statically
app.use('/uploads', express.static(UPLOAD_DIR));

/**
 * GET /api/tracks
 *
 * Returns the current library.  Each track includes an id, title and url.
 */
app.get('/api/tracks', (_req, res) => {
  res.json(library);
});

/**
 * POST /api/upload
 *
 * Accepts multipart/form-data with one or more files under the `file` field.
 * Adds the uploaded tracks to the library and returns them.  The returned
 * objects include their ids, titles and absolute URLs.
 */
app.post('/api/upload', upload.array('file'), (req, res) => {
  const added = [];
  for (const file of req.files || []) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const url = `/uploads/${file.filename}`;
    const title = file.originalname.replace(/\.[^.]+$/, '');
    const track = {
      id,
      title,
      url: absoluteUrl(req, url),
    };
    library.push(track);
    added.push(track);
  }
  res.json(added);
});

/**
 * DELETE /api/tracks/:id
 *
 * Removes a track from the library and deletes its file if it was uploaded via
 * this server.  Returns { ok: true } on success or 404 if the track was not
 * found.
 */
app.delete('/api/tracks/:id', (req, res) => {
  const idx = library.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Not found' });
  }
  const track = library.splice(idx, 1)[0];
  // Try to delete the file if it is local
  const url = track.url || '';
  const origin = getOrigin(req);
  if (url.startsWith(`${origin}/uploads/`)) {
    const filename = url.split('/uploads/')[1];
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.promises.unlink(filepath).catch(() => {});
  }
  res.json({ ok: true });
});

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});