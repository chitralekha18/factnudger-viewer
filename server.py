#!/usr/bin/env python3
"""Local FactNudger video library. Python standard library only."""
import json, os, re, mimetypes, time, urllib.parse, urllib.request, urllib.error
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent
config = ROOT / '.env'
if config.exists():
    for line in config.read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            if key.strip() in ('YOUTUBE_API_KEY', 'PORT'):
                os.environ.setdefault(key.strip(), value.strip().strip('\"\''))
CACHE = {}

class Handler(BaseHTTPRequestHandler):
    def json(self, payload, status=200):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        if self.command != 'HEAD': self.wfile.write(data)

    def do_HEAD(self): self.do_GET()

    def do_GET(self):
        url = urllib.parse.urlsplit(self.path)
        if url.path == '/api/config':
            return self.json({'searchEnabled': bool(os.getenv('YOUTUBE_API_KEY'))})
        if url.path == '/api/search':
            query = urllib.parse.parse_qs(url.query).get('q', [''])[0].strip()[:200]
            if not query: return self.json({'error': 'Enter a topic to search.'}, 400)
            key = os.getenv('YOUTUBE_API_KEY')
            if not key: return self.json({'error': 'YouTube search needs an API key. Add it to the .env file and restart the app. You can still paste a video link or play a demo clip.'}, 503)
            cache_key = query.casefold()
            if cache_key in CACHE and time.time() - CACHE[cache_key][0] < 900:
                return self.json(CACHE[cache_key][1])
            params = urllib.parse.urlencode({'part':'snippet','type':'video','videoEmbeddable':'true','videoSyndicated':'true','maxResults':12,'q':query,'key':key})
            try:
                with urllib.request.urlopen('https://www.googleapis.com/youtube/v3/search?' + params, timeout=15) as response:
                    result = json.load(response)
                items = [{'kind':'youtube','id':v['id']['videoId'],'title':v['snippet']['title'],'author':v['snippet']['channelTitle'],'thumbnail':v['snippet']['thumbnails']['medium']['url']} for v in result.get('items', []) if 'videoId' in v.get('id', {})]
                payload = {'items':items}
                if len(CACHE) > 100: CACHE.clear()
                CACHE[cache_key] = (time.time(), payload)
                return self.json(payload)
            except urllib.error.HTTPError as err:
                message = 'YouTube search is unavailable. Check the API key, enabled YouTube Data API, and search quota.' if err.code in (400,403) else 'YouTube search is temporarily unavailable. Try again or paste a link.'
                return self.json({'error':message}, 502)
            except (OSError, ValueError, KeyError):
                return self.json({'error':'Could not reach YouTube. Check the internet connection or choose a demo clip.'}, 502)
        files = {'/':ROOT/'static/index.html','/app.js':ROOT/'static/app.js','/style.css':ROOT/'static/style.css'}
        for n in (1,2):
            files[f'/media/video{n}.mp4'] = ROOT/f'media/video{n}.mp4'
            files[f'/media/poster{n}.jpg'] = ROOT/f'media/poster{n}.jpg'
        path = files.get(url.path)
        if not path or not path.is_file(): return self.json({'error':'File not found.'},404)
        size = path.stat().st_size
        start, end, status = 0, size-1, 200
        range_header = self.headers.get('Range')
        if range_header:
            match = re.fullmatch(r'bytes=(\d*)-(\d*)',range_header)
            if not match or not any(match.groups()): return self.range_error(size)
            a,b = match.groups()
            if a:
                start = int(a)
                end = min(int(b), size-1) if b else size-1
            else:
                start = max(0,size-int(b))
            if start > end or start >= size: return self.range_error(size)
            status = 206
        self.send_response(status)
        self.send_header('Content-Type', mimetypes.guess_type(path)[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(end-start+1))
        self.send_header('Accept-Ranges','bytes')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','strict-origin-when-cross-origin')
        if status == 206: self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.end_headers()
        if self.command == 'HEAD': return
        try:
            with path.open('rb') as f:
                f.seek(start)
                remaining = end-start+1
                while remaining:
                    chunk=f.read(min(65536, remaining))
                    if not chunk: break
                    self.wfile.write(chunk)
                    remaining-=len(chunk)
        except (BrokenPipeError, ConnectionResetError): pass

    def range_error(self,size):
        self.send_response(416)
        self.send_header('Content-Range',f'bytes */{size}')
        self.send_header('Content-Length','0')
        self.end_headers()

if __name__ == '__main__':
    port=int(os.getenv('PORT','8765'))
    server=ThreadingHTTPServer(('127.0.0.1',port),Handler)
    print(f'FactNudger is ready at http://localhost:{port}',flush=True)
    server.serve_forever()
