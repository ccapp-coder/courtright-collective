# TinkerTaps game demo videos

One demo video per game showcased on tinkertaps.courtrightco.com — 14 in all, in the app's calm, soft visual style (1434×660 landscape, MP4/H.264, silent, ~15s each). Each video: TinkerTaps title card → simulated gameplay with a visible touch indicator → "Big ideas for little hands." end card.

| Video | Game |
|---|---|
| `tinkertaps-shape-sorting-demo.mp4` | Match · Shape Sorting |
| `tinkertaps-stacking-towers-demo.mp4` | Build · Stacking Towers |
| `tinkertaps-bouncing-bubbles-demo.mp4` | Pop · Bouncing Bubbles |
| `tinkertaps-snack-stacker-demo.mp4` | Make · Snack Stacker |
| `tinkertaps-brick-breaker-demo.mp4` | Bounce · Brick Breaker |
| `tinkertaps-busy-town-demo.mp4` | Explore · Busy Town |
| `tinkertaps-water-play-demo.mp4` | Pour · Water Play |
| `tinkertaps-colors-patterns-demo.mp4` | Fill · Colors & Patterns |
| `tinkertaps-rocket-dash-demo.mp4` | Fly · Rocket Dash |
| `tinkertaps-sensory-shapes-demo.mp4` | Discover · Sensory Shapes |
| `tinkertaps-light-play-demo.mp4` | Glow · Light Play |
| `tinkertaps-nature-animals-demo.mp4` | Explore · Nature & Animals |
| `tinkertaps-balloon-rise-demo.mp4` | Float · Balloon Rise |
| `tinkertaps-silly-faces-demo.mp4` | Create · Silly Faces |

## Re-rendering

Videos are generated from the animated scenes in `source/` (one shared engine + all 14 scenes in `scenes.js`, played via `player.html?scene=<name>`):

```
cd tinkertaps-demos/source
npm i -g playwright        # plus a full ffmpeg build (edit FFMPEG path in record.js)
node record.js                       # renders all 14 to source/out/
SCENES=busy-town,water-play node record.js   # re-render specific scenes
```

Colors, games, and copy come from the tinkertaps site repo; fonts (Fredoka One + Outfit + Cormorant Garamond) are bundled in `source/fonts/`.
