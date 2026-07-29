# Hero video loops — drop files here

The site is already wired. Save a file with the exact name and it takes over
automatically; until then each header falls back to its still image.

| File | Used on |
|---|---|
| `hero-loop.mp4` | index.html |
| `homes-loop.mp4` | homes.html |
| `neighbourhood-loop.mp4` | neighbourhood.html |

A `.webm` twin of the same name loads first if present. The `.mp4` is required
for Safari.

**Specs:** 1920×1080, 6–12 s, seamless loop, no audio track, under 4 MB,
`-movflags +faststart`. Static camera — only sky and foliage move.

```bash
ffmpeg -i raw.mp4 -an -c:v libx264 -crf 26 -preset slow \
  -pix_fmt yuv420p -movflags +faststart -vf "scale=1920:-2" hero-loop.mp4
```
