/* Records each TinkerTaps demo scene to webm via Playwright, then converts to mp4. */
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const OUT = path.join(DIR, "out");
const FFMPEG = "/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2";
const ALL = ["shape-sorting", "stacking-towers", "bouncing-bubbles", "snack-stacker",
  "brick-breaker", "busy-town", "water-play", "colors-patterns", "rocket-dash",
  "sensory-shapes", "light-play", "nature-animals", "balloon-rise", "silly-faces"];
const SCENES = process.env.SCENES ? process.env.SCENES.split(",") : ALL;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const scene of SCENES) {
    console.log("recording", scene);
    const ctx = await browser.newContext({
      viewport: { width: 1434, height: 660 },
      recordVideo: { dir: OUT, size: { width: 1434, height: 660 } },
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.error("PAGE ERROR:", scene, e.message));
    await page.goto("file://" + path.join(DIR, "player.html") + "?scene=" + scene);
    await page.waitForFunction("window.__done === true", null, { timeout: 60000 });
    await page.waitForTimeout(300);
    const video = page.video();
    await ctx.close();
    const webm = await video.path();
    const mp4 = path.join(OUT, `tinkertaps-${scene}-demo.mp4`);
    execFileSync(FFMPEG, [
      "-y", "-i", webm,
      "-c:v", "libx264", "-preset", "slow", "-crf", "21",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", "30",
      mp4,
    ], { stdio: "pipe" });
    fs.unlinkSync(webm);
    console.log("wrote", mp4);
  }
  await browser.close();
})();
