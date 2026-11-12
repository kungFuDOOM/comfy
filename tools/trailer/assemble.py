#!/usr/bin/env python3
"""Cuts the captured frames to the timeline, layers captions / title / UI on top, and muxes the soundtrack.

    python3 tools/trailer/assemble.py <work dir> <out.mp4>

<work dir> holds frames/<shot>/fNNNN.png (capture.cjs), overlays/*.png (overlays.cjs),
ui/skills.png + ui/levelup-*.png (ui.cjs) and soundtrack.wav (audio.cjs).
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1920, 1080


def timeline():
    js = f"console.log(JSON.stringify(require({json.dumps(os.path.join(HERE, 'timeline.cjs'))})))"
    return json.loads(subprocess.check_output(['node', '-e', js]))


def smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def ease_back(x):
    x = min(1.0, max(0.0, x))
    return 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2


class Overlays:
    def __init__(self, work):
        self.work = work
        self.cache = {}

    def get(self, name):
        if name not in self.cache:
            im = Image.open(os.path.join(self.work, name)).convert('RGBA')
            box = im.getbbox() or (0, 0, 1, 1)
            self.cache[name] = (im.crop(box), box)
        return self.cache[name]


def paste(base, im, x, y, alpha):
    if alpha <= 0.003:
        return
    if alpha < 0.999:
        a = im.getchannel('A').point(lambda v: int(v * alpha))
        im = im.copy()
        im.putalpha(a)
    base.alpha_composite(im, (int(round(x)), int(round(y))))


def compose(tl, ov, skills, work, g):
    fps = tl['FPS']
    T = g / fps
    shot = next(s for s in tl['shots'] if s['start'] <= T + 1e-6 < s['end']) if T < tl['END'] else tl['shots'][-1]
    i = g - int(round(shot['start'] * fps))
    lt = T - shot['start']
    dur = shot['end'] - shot['start']
    if shot.get('still'):
        # the real Skills panel: lifted off a softly blurred game frame, sitting left so the caption has room
        k = smooth(0, dur, lt)
        frame = ov.skills_bg.copy()
        panel = ov.skills_panel
        s = 0.96 + 0.06 * k
        p2 = panel.resize((int(panel.width * s), int(panel.height * s)), Image.LANCZOS)
        rise = 30 * (1 - smooth(0, 0.5, lt))
        frame.paste(p2, (int(600 - p2.width / 2), int(H / 2 - p2.height / 2 + rise)), p2)
    else:
        d = os.path.join(work, 'frames', shot['id'])
        n = len(os.listdir(d))
        frame = Image.open(os.path.join(d, f'f{min(i, n - 1):04d}.png')).convert('RGB').resize((W, H), Image.LANCZOS)
    frame = frame.convert('RGBA')

    for c in tl['captions']:
        if not (c['start'] - 0.01 <= T <= c['end'] + 0.01):
            continue
        k = c['kind']
        fin = 0.45 if k in ('title', 'endcard') else 0.35
        a = smooth(c['start'], c['start'] + fin, T) * (1 - smooth(c['end'] - 0.35, c['end'], T))
        if k == 'levelup':
            im, box = ov.get(f"ui/levelup-{c['skill']}.png")
            pop = ease_back((T - c['start']) / 0.32)
            s = 1.3 * max(0.05, 0.6 + 0.4 * pop)
            im2 = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
            cx, cy = W / 2, 150 + 16 * (1 - smooth(c['start'], c['start'] + 0.3, T))
            paste(frame, im2, cx - im2.width / 2, cy - im2.height / 2, a)
            continue
        im, box = ov.get(f"overlays/{c['id']}.png")
        x, y = box[0], box[1]
        if k == 'feature':
            x -= 46 * (1 - smooth(c['start'], c['start'] + 0.4, T))
        elif k == 'story':
            y += 14 * (1 - smooth(c['start'], c['start'] + 0.6, T))
        elif k in ('title', 'endcard'):
            s = 1.0 + 0.05 * (1 - smooth(c['start'], c['start'] + 1.2, T)) + 0.015 * smooth(c['start'], c['end'], T)
            if abs(s - 1) > 0.002:
                im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
                x = box[0] + (box[2] - box[0]) / 2 - im.width / 2
                y = box[1] + (box[3] - box[1]) / 2 - im.height / 2
        paste(frame, im, x, y, a)

    rgb = np.asarray(frame.convert('RGB'), dtype=np.float32)
    # bell flash on the title drop, fade up from black, fade out at the very end
    flash = 0.9 * (1 - smooth(15.0, 15.7, T)) if T >= 15.0 else 0.0
    if flash > 0:
        rgb = rgb * (1 - flash) + 255 * flash
    black = max(1 - smooth(0, 1.4, T), smooth(tl['END'] - 1.0, tl['END'], T))
    if black > 0:
        rgb = rgb * (1 - black)
    return rgb.clip(0, 255).astype(np.uint8)


def main():
    work, out = sys.argv[1], sys.argv[2]
    tl = timeline()
    fps = tl['FPS']
    total = int(round(tl['END'] * fps))
    ov = Overlays(work)
    skills = Image.open(os.path.join(work, 'ui', 'skills.png')).convert('RGB')
    # backdrop: the shot before it (foraging), softly blurred, so the panel feels opened mid-play
    prev = os.path.join(work, 'frames', 'forage')
    src = Image.open(os.path.join(prev, sorted(os.listdir(prev))[-1])).convert('RGB').resize((W, H), Image.LANCZOS) if os.path.isdir(prev) else skills
    ov.skills_bg = src.filter(ImageFilter.GaussianBlur(12)).point(lambda v: int(v * 0.86))
    # the Journal panel (1920x1080 capture), with its rounded corners kept
    box = (681, 59, 1239, 1021)
    panel = skills.crop(box).convert('RGBA')
    mask = Image.new('L', panel.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, panel.width - 1, panel.height - 1), radius=30, fill=255)
    panel.putalpha(mask)
    ov.skills_panel = panel

    if len(sys.argv) > 3:  # preview: python3 assemble.py <work> <out.png> <seconds>
        T = float(sys.argv[3])
        Image.fromarray(compose(tl, ov, skills, work, int(round(T * fps)))).save(out)
        return

    ff = subprocess.Popen([
        'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
        '-i', os.path.join(work, 'soundtrack.wav'),
        '-filter:a', 'loudnorm=I=-15:TP=-1.5:LRA=11',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-tune', 'animation',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
        '-movflags', '+faststart', '-shortest', out,
    ], stdin=subprocess.PIPE)

    for g in range(total):
        ff.stdin.write(compose(tl, ov, skills, work, g).tobytes())
        if g % 120 == 0:
            print(f'frame {g}/{total}', flush=True)
    ff.stdin.close()
    ff.wait()
    print('wrote', out)


if __name__ == '__main__':
    main()
