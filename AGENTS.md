# Production Cache Policy & Configuration Rules

## No Cache for Previous Productions

- **Zero Retention of Previous Productions**: Never retain, persist, or cache media files, blobs, temporary frames, separated stems, or exported videos from previous productions on the computer.
- **Automatic Cleanup**:
  - Client-side applications must revoke all `ObjectURL`s, release `MediaRecorder` blobs/chunks (`recordedChunks = []`, `recordedVideoBlob = null`), and clear `localStorage`, `sessionStorage`, `caches`, and `indexedDB` on startup, reset, and export completion.
  - Server-side applications must serve responses with `Cache-Control: no-store, no-cache, must-revalidate` and automatically purge any temporary or previous production files (`exports/`, `temp_frames/`, `audio_library/`, `image_library/`, `output/`) when starting a new production or starting the server.
- **App_SlideShow Configuration (`config.json` / `APP_CONFIG`)**:
  - `maxMusicTracks`: `4` (supports up to 4 sequential looping music tracks)
  - `allowMp4InPictures`: `true` (Step 2 Pictures accepts both images and `.mp4` videos)
  - `cachePreviousProductions`: `false`
  - `autoPurgeProductionCache`: `true`
