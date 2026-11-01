#!/usr/bin/env python3
"""Prepare playable copies without modifying original footage."""
import json, shutil, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent.parent / 'factually'
if len(sys.argv) > 1: SOURCE = Path(sys.argv[1])
if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
    sys.exit('Install FFmpeg first, then rerun this script.')
(ROOT/'media').mkdir(exist_ok=True)
for n in (1,2):
    source=SOURCE/f'Video{n}.mov'
    output=ROOT/f'media/video{n}.mp4'
    if not source.exists(): sys.exit(f'Missing original: {source}')
    if not output.exists():
        print(f'Reading Video {n}. Dropbox must have downloaded the original.',flush=True)
        try:
            probe=subprocess.run(['ffprobe','-v','error','-show_streams','-of','json',str(source)],capture_output=True,text=True,check=True,timeout=30)
        except subprocess.TimeoutExpired:
            sys.exit('The original is not readable yet. In Dropbox/Finder choose Make available offline for both MOV files, wait for downloading to finish, and rerun.')
        streams=json.loads(probe.stdout)['streams']
        video=next(s for s in streams if s['codec_type']=='video')
        temporary=output.with_name(f'video{n}.partial.mp4')
        codec=['-c:v','copy'] if video['codec_name']=='h264' and video.get('pix_fmt')=='yuv420p' else ['-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p']
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(source),'-map','0:v:0','-map','0:a:0?',*codec,'-c:a','aac','-b:a','192k','-movflags','+faststart',str(temporary)],check=True)
        temporary.replace(output)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss','2','-i',str(output),'-frames:v','1','-vf','scale=960:-1',str(ROOT/f'media/poster{n}.jpg')],check=True)
    print(f'Video {n} is ready.',flush=True)
