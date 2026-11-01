# FactNudger viewing room

A local video interface for the UIST demo. The phone/watch listens through its own microphone. This page plays audio through the computer speakers; it does not connect to the watch, record audio, or display fact-checking results.

## Start

Double-click **Start.command**, keep its terminal window open, then visit **http://localhost:8765** in Chrome or Safari. Alternatively, run `python3 server.py` from this folder. Requires Python 3; there are no package dependencies. Stop with Control-C in the terminal.

## YouTube topic search

Copy `.env.example` to `.env`, set `YOUTUBE_API_KEY` to a Google Cloud API key with **YouTube Data API v3** enabled, and restart the server. Keep this key private. Restrict the key to YouTube Data API v3 in Google Cloud. The key stays on the local server and is never sent to the page. Search submits only on request and caches results for 15 minutes to reduce quota usage. Without a key, demo clips and pasted links still work, and topic search displays setup guidance.

## Demo flow

1. Start listening in the FactNudger phone/watch app.
2. Turn on the computer speakers and select either pinned demo clip.
3. Search YouTube or paste a YouTube/TikTok video URL to explore. TikTok requires a full video URL, not a shortened share link. General TikTok topic search is not supported.
4. Selected online videos appear in Recently played, stored in this browser. Clear removes history without stopping playback.
5. Reset demo stops playback, clears recent history and search, and returns to the first demo, paused. It does not reset the separate phone/watch app.

Online platforms may require another click to play, block embedding, or show platform content such as ads. The original-platform link offers a fallback. Use local clips when internet access is unreliable. The fact-checking app may still need internet independently.

## Files

- `server.py`: local web server, media byte-range support for seeking, YouTube search proxy.
- `static/`: interface files.
- `media/video1.mp4`, `media/video2.mp4`: browser-compatible demo copies, with poster images.
- Original videos remain unchanged at `../../factually/Video1.mov` and `../../factually/Video2.mov` relative to this folder.

The server binds only to this computer (127.0.0.1) and serves an explicit list of public files. `.env` and source files are not served. Set PORT in `.env` if 8765 is occupied.

## Prepare the two demo files

If the media folder is empty, first mark both original MOV files **Make available offline** in Dropbox/Finder and wait for their downloads to finish. Then run `python3 prepare_media.py` from this folder (FFmpeg must be installed). The script creates MP4 copies and thumbnails without changing the originals. H.264 video is remuxed when compatible; other codecs are converted. An optional argument supplies a different source folder. Reload the viewing page after preparation.

## Online demo fallback

The two pinned demos prefer the local MP4 copies. If a local file is missing or fails to load, the player automatically switches to the corresponding Google Drive preview. Online playback needs internet and may require pressing Play inside the embedded player. Open original is available if Drive cannot play inline.

- Video 1: https://drive.google.com/file/d/1d0OLtSKM-egUq5b3Zh8bu8-u5RuOJ-ga/view
- Video 2: https://drive.google.com/file/d/1AkcGXUMOWT7UATB0rO40B4LXZYxTduJp/view

The interface uses a black background with navy accents and bold sans-serif branding adapted from the UIST poster.

## Public GitHub Pages version

The public site is built into `docs/` by `python3 build_pages.py`. Publish only that folder from the main branch. The build copies an explicit allowlist: HTML, CSS, JavaScript, and the two thumbnails. It never reads `.env`, publishes the Python server, or includes local movies. Rebuild after frontend edits.

On Pages, demo videos use Google Drive and pasted YouTube/TikTok links work without a key. Topic search asks each visitor for their own YouTube Data API key. The key stays in tab memory, is sent only to Google in an HTTP header, and is cleared on reload/navigation or Remove key. It is not stored in localStorage, cookies, GitHub, or page URLs. Recently played video metadata still uses localStorage. No third-party JavaScript runs in the public page's own origin; video providers load in cross-origin frames.

Client-side keys are observable by the person using the browser and are not secrets. For a controlled demo, create a dedicated key, restrict its API access to YouTube Data API v3, and restrict its website referrers to `https://chitralekha18.github.io/*`. Browsers typically send just the origin for cross-origin API requests, so a restriction to only the repository path may fail. Set an appropriate quota and revoke the demo key afterward. Never embed a shared key in this build or distribute an unrestricted key. A public service with shared, keyless search requires a separate backend with rate limiting and abuse controls; GitHub Pages cannot run the Python server.

The repository can remain private if the GitHub account's plan supports Pages from private repositories. The published frontend and demo-video links are public.
