# Spotify‑Style Music Web App

This repository contains a simple **Spotify‑style music website** that you can run locally.  The project consists of a React front‑end and an optional Node/Express back‑end for persistent uploads.  Use the front‑end on its own to play files from your computer, or pair it with the back‑end to store and stream your library from a server.

## Features

- **Drag‑and‑drop uploads** or click a button to select music files from your computer
- **Playlist management**: view your library, play tracks, or remove tracks
- **Audio player controls**: play/pause, next/previous, shuffle, repeat (one/all/off), seek bar and time display, and volume control
- **Responsive dark UI** built with Tailwind CSS and lucide icons – inspired by Spotify
- **Optional server** to persist uploads in a local folder and stream them back to the front‑end

## Getting started

### Front‑end

The front‑end is located in the `frontend` folder.  It is a Vite React project.  To run it:

```bash
cd frontend
# install dependencies (requires Node ≥18; see [Vite docs](https://vite.dev/guide/))
npm install

# start the development server
npm run dev

# the app will be available at http://localhost:5173
```

By default the player works entirely on the client: uploaded files remain in memory and are never sent to a server.

### Back‑end (optional)

If you want to persist uploads and stream tracks from a server, run the back‑end in the `backend` folder:

```bash
cd backend
npm install
npm start

# the API will run on http://localhost:4000
```

After starting the back‑end, update the `API_BASE` constant in `frontend/src/App.jsx` from `""` to `"http://localhost:4000"`.  When set, the upload button will send files to the server instead of keeping them locally, and the playlist will fetch your library on page load.

## Folder structure

- `frontend/` – React application created with Vite.  Contains all UI code and state management.
- `backend/` – Simple Node/Express server to handle uploads and serve files.  Completely optional.
- `README.md` – this file.

Feel free to modify and extend the project.  See the code comments for hints on how each piece works.
