# Trivd game mode demo videos

One demo video per Trivd game mode, in the app's brand style (720×1280 portrait, MP4/H.264, silent — ready for App Store previews, social, or the trivd.courtrightco.com landing page).

| Video | Mode | What it shows |
|---|---|---|
| `trivd-speed-duel-demo.mp4` | ⚡ Speed Duel | 1v1 matchup vs Maya, racing to tap first, losing a round, buzzer-beater win |
| `trivd-accuracy-mode-demo.mp4` | 🎯 Accuracy Mode | Room code lobby, 3/5/7 rounds pick, streak ×2 multiplier, live leaderboard |
| `trivd-dare-mode-demo.mp4` | 🎲 Dare Mode | Punishment picker, pass-the-phone play, dice roll, loser's dare card |
| `trivd-chaos-mode-demo.mp4` | 💥 Chaos Mode | Double Down 2×, opponent Shuffle + Freeze, steal round, mayhem victory |

## Re-rendering

The videos are generated from the animated HTML scenes in `source/`. To re-render after editing a scene:

```
cd trivd-demos/source
npm i -g playwright        # plus a full ffmpeg build on PATH (edit FFMPEG in record.js)
node record.js             # writes MP4s to source/out/
SCENES=chaos-mode node record.js   # re-render a single scene
```

Colors, fonts (Outfit + Cormorant Garamond, bundled in `source/fonts/`), and copy are pulled from the trivd-site landing page so everything stays on-brand.
