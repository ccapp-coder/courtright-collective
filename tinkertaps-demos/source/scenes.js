/* All 14 TinkerTaps game demo scenes. Stage is 1434x660. */

const SCENES = {};

/* ── 1. Match · Shape Sorting (ss02) ── */
SCENES["shape-sorting"] = async () => {
  await titleCard("Match", "Shape Sorting", "Drag each shape to its home", ["#E05A5A", "#6FA8DC", "#F2A0B5", "#F0A050"]);
  const sc = $("#scene");
  sc.style.background = "linear-gradient(180deg,#B5854E,#8F6234)";
  const h = hud(sc, [["⭐", 0], ["🏆", 1]]);

  // red strip with silhouettes
  const strip = prop(sc, "soft", { left: "60px", top: "70px", width: "1314px", height: "150px",
    background: "#C0392B", borderRadius: "8px" });
  const sil = (html, x) => prop(strip, null, { left: x + "px", top: "25px", width: "100px",
    height: "100px", display: "flex", alignItems: "center", justifyContent: "center" }, html);
  const starSlot = sil('<div style="font-size:104px;color:#2A0E0A">★</div>', 150);
  const circSlot = sil('<div style="width:96px;height:96px;border-radius:50%;background:#2A0E0A"></div>', 990);
  sil('<div style="width:92px;height:92px;background:#2A0E0A"></div>', 700);
  sil('<div style="width:0;height:0;border-left:50px solid transparent;border-right:50px solid transparent;border-bottom:88px solid #A8D8AC"></div>', 420);

  // loose shapes below
  const ball = prop(sc, "circle soft", { left: "300px", top: "380px", width: "110px", height: "110px",
    background: "radial-gradient(circle at 35% 30%, #BBDCF5, #6FA8DC)" });
  const star = prop(sc, null, { left: "620px", top: "370px", fontSize: "120px", color: "#F2A0B5",
    textShadow: "0 6px 14px rgba(0,0,0,0.15)" }, "★");
  prop(sc, "soft", { left: "980px", top: "395px", width: "100px", height: "100px",
    background: "linear-gradient(135deg,#FFF3D0,#F0A050)" });
  sc.classList.add("on");
  await sleep(900);

  // drag star into star slot
  await drag(680, 440, 210 + 50 + 60, 190, 1000, star);
  star.style.left = "196px"; star.style.top = "62px"; star.style.color = "#F2A0B5";
  star.classList.add("wiggle");
  sparkle(260, 160, 7);
  h.set(0, 1);
  await sleep(900);

  // drag ball into circle slot
  await drag(355, 435, 1105, 190, 1000, ball);
  ball.style.left = "1052px"; ball.style.top = "97px";
  circSlot.firstChild.style.background = "radial-gradient(circle at 35% 30%, #BBDCF5, #6FA8DC)";
  ball.remove();
  sparkle(1105, 170, 7);
  h.set(0, 2);
  await sleep(1200);
};

/* ── 2. Build · Stacking Towers (ss03) ── */
SCENES["stacking-towers"] = async () => {
  await titleCard("Build", "Stacking Towers", "Stack blocks. Test gravity.", ["#F0A050", "#6FA8DC", "#E05A5A", "#5CAF5F"]);
  const sc = $("#scene");
  sc.style.background = "linear-gradient(180deg,#AEDCE8 0%,#D8CBB0 78%,#7A4E22 78%)";
  hud(sc, [["🧱", 0], ["🏆", 2]]);

  // palette bar
  const bar = prop(sc, null, { left: "440px", top: "570px", width: "550px", height: "70px",
    background: "#5E3A16", borderRadius: "999px", display: "flex", alignItems: "center",
    justifyContent: "space-around", padding: "0 30px" });
  const sw = (css) => { const d = el("div"); Object.assign(d.style, css); bar.appendChild(d); return d; };
  const swOrange = sw({ width: "52px", height: "30px", background: "linear-gradient(135deg,#FFE2B8,#F0A050)", borderRadius: "4px" });
  const swRed = sw({ width: "38px", height: "38px", background: "linear-gradient(135deg,#FFC9C9,#E05A5A)", borderRadius: "4px" });
  const swTri = sw({ width: "0", height: "0", borderLeft: "20px solid transparent",
    borderRight: "20px solid transparent", borderBottom: "34px solid #5CAF5F" });

  const groundY = 518;
  sc.classList.add("on");
  await sleep(800);

  // tap orange slab -> lands as base
  await touch(495, 605);
  const base = prop(sc, "soft pop-in", { left: "617px", top: groundY - 60 + "px", width: "200px", height: "60px",
    background: "linear-gradient(135deg,#FFE2B8,#F0A050)", borderRadius: "6px" });
  await sleep(700);

  // tap red block -> stacks
  await touch(640, 605);
  prop(sc, "soft pop-in", { left: "652px", top: groundY - 60 - 130 + "px", width: "130px", height: "130px",
    background: "linear-gradient(135deg,#FFC9C9,#E05A5A)", borderRadius: "8px" });
  await sleep(700);

  // tap triangle -> roof
  await touch(790, 600);
  prop(sc, "pop-in", { left: "657px", top: groundY - 60 - 130 - 84 + "px", width: "0", height: "0",
    borderLeft: "60px solid transparent", borderRight: "60px solid transparent",
    borderBottom: "84px solid #5CAF5F" });
  sparkle(717, 240, 6);
  await sleep(800);

  // gravity button -> tower bounces
  const grav = prop(sc, "circle soft", { left: "1290px", top: "440px", width: "88px", height: "88px",
    background: "#5CAF5F", display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "17px" }, "⬇<br/>Gravity");
  await sleep(500);
  await touch(1334, 484);
  [...sc.children].forEach((c) => { if (c !== grav && !c.classList.contains("hud-pill") && c.id !== "pause")
    c.style.animation = "wiggle 0.55s ease-in-out"; });
  await sleep(1300);
};

/* ── 3. Pop · Bouncing Bubbles (ss04) ── */
SCENES["bouncing-bubbles"] = async () => {
  await titleCard("Pop", "Bouncing Bubbles", "Guide each ball to its color", ["#E05A5A", "#6FA8DC", "#5CAF5F", "#F0D060"]);
  const sc = $("#scene");
  sc.style.background = "linear-gradient(180deg,#EFD9A8,#DFC08A)";
  const h = hud(sc, [["🎨", 0], ["🏆", 1]]);

  const pocket = (x, y, color) => prop(sc, "circle soft", { left: x + "px", top: y + "px",
    width: "120px", height: "120px",
    background: `radial-gradient(circle at 40% 32%, ${color}CC, ${color})`,
    border: "8px solid rgba(0,0,0,0.12)" });
  const pr = pocket(290, 40, "#E05A5A"), pb = pocket(660, 40, "#6FA8DC"); pocket(1030, 40, "#5CAF5F");
  pocket(290, 490, "#F0D060"); pocket(660, 490, "#B08FD8"); pocket(1030, 490, "#F0A050");

  const mkBall = (x, y, color) => prop(sc, "circle soft", { left: x + "px", top: y + "px",
    width: "56px", height: "56px",
    background: `radial-gradient(circle at 35% 28%, #fff9, ${color})`,
    transition: "left 1s ease-in-out, top 1s ease-in-out" });
  const b1 = mkBall(560, 330, "#E05A5A");
  const b2 = mkBall(900, 240, "#6FA8DC");
  mkBall(420, 200, "#F0D060"); mkBall(760, 420, "#B08FD8"); mkBall(1120, 350, "#5CAF5F");
  sc.classList.add("on");
  // ambient bouncing
  const amb = setInterval(() => {
    [...sc.querySelectorAll("div")].forEach((d) => {});
  }, 900);
  await sleep(800);

  // drag red ball to red pocket
  await drag(588, 358, 350, 120, 1100, b1);
  b1.remove(); sparkle(350, 110, 8); h.set(0, 1);
  await sleep(800);

  // drag blue ball to blue pocket
  await drag(928, 268, 720, 120, 1100, b2);
  b2.remove(); sparkle(720, 110, 8); h.set(0, 2);
  clearInterval(amb);
  await sleep(1200);
};

/* ── 4. Make · Snack Stacker (ss05) ── */
SCENES["snack-stacker"] = async () => {
  await titleCard("Make", "Snack Stacker", "Build the snack your bunny wants", ["#F2A0B5", "#F0D060", "#5CAF5F", "#E05A5A"]);
  const sc = $("#scene");
  sc.style.background = "linear-gradient(180deg,#FBE3C4 0%,#F6D2A8 60%,#7A4E22 60%,#7A4E22 76%,#EFD9B8 76%)";
  const h = hud(sc, [["💰", 0], ["🏆", 5]]);

  // recipe chip
  const recipe = prop(sc, "soft", { left: "560px", top: "30px", width: "314px", height: "74px",
    background: "#FFF7EA", border: "6px solid #7A4E22", borderRadius: "18px", display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: "36px" }, "🍞 + 🍅 + 🧀");

  // windows
  const win = (x) => { const w = prop(sc, "soft", { left: x + "px", top: "110px", width: "260px",
    height: "170px", background: "linear-gradient(180deg,#A8D4F0 55%,#8CC63F 55%)",
    border: "10px solid #6B3F1A", borderRadius: "6px" });
    prop(w, null, { left: "-30px", top: "-8px", width: "26px", height: "160px", background: "#D05070" });
    prop(w, null, { right: "-30px", top: "-8px", width: "26px", height: "160px", background: "#D05070" }); };
  win(130); win(1020);

  // bunny
  const bunny = prop(sc, null, { left: "620px", top: "205px", width: "190px", height: "200px" });
  prop(bunny, "circle", { left: "20px", top: "-52px", width: "34px", height: "86px", background: "#fff", borderRadius: "40%" });
  prop(bunny, "circle", { left: "128px", top: "-52px", width: "34px", height: "86px", background: "#fff", borderRadius: "40%" });
  prop(bunny, "circle soft", { left: "0", top: "0", width: "184px", height: "184px", background: "#fff" });
  prop(bunny, "circle", { left: "52px", top: "66px", width: "16px", height: "16px", background: "#333" });
  prop(bunny, "circle", { left: "116px", top: "66px", width: "16px", height: "16px", background: "#333" });
  prop(bunny, "circle", { left: "82px", top: "92px", width: "20px", height: "16px", background: "#8B5C2A" });

  // plate
  prop(sc, "soft", { left: "560px", top: "420px", width: "310px", height: "26px", background: "#fff", borderRadius: "50%" });
  // food buttons
  const foods = ["🍞", "🍅", "🧀", "🥬", "🍟"];
  const btns = foods.map((f, i) => prop(sc, "circle soft", { left: 420 + i * 120 + "px", top: "560px",
    width: "84px", height: "84px", background: "#fff", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "44px", border: "4px solid #E8D9C0" }, f));
  sc.classList.add("on");
  await sleep(900);

  const stack = [];
  const layers = [["#F0C060", 0], ["#E05A5A", 1], ["#F0D060", 2]]; // bread, tomato, cheese
  for (let i = 0; i < 3; i++) {
    await touch(462 + i * 120, 602);
    const y = 408 - stack.length * 26;
    stack.push(prop(sc, "soft pop-in", { left: "620px", top: y + "px", width: "190px", height: "24px",
      background: layers[i][0], borderRadius: "10px" }));
    await sleep(420);
  }
  // bunny happy hop + reward
  bunny.classList.add("wiggle");
  sparkle(715, 300, 8);
  recipe.innerHTML = "✅ Yum!";
  h.set(0, 1);
  await sleep(1400);
};

/* ── 5. Bounce · Brick Breaker (ss06) ── */
SCENES["brick-breaker"] = async () => {
  await titleCard("Bounce", "Brick Breaker", "Catch the balls. Clear the bricks.", ["#E05A5A", "#F0D060", "#2E4A8F", "#fff"]);
  const sc = $("#scene");
  sc.style.background = "linear-gradient(180deg,#1E3A7A,#16295C)";
  const h = hud(sc, [["🎯", 0]]);

  // bricks
  const bricks = [];
  for (let i = 0; i < 9; i++) bricks.push(prop(sc, "soft", { left: 30 + i * 155 + "px", top: "18px",
    width: "130px", height: "44px", background: "#E05A6A", border: "3px solid #FFD9DC",
    borderRadius: "999px" }));
  // pegs
  for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++)
    prop(sc, "circle", { left: 60 + c * 100 + (r % 2) * 50 + "px", top: 130 + r * 82 + "px",
      width: "18px", height: "18px", background: "#F0D060" });
  // paddle row
  for (let i = 0; i < 9; i++) prop(sc, null, { left: 10 + i * 160 + "px", top: "600px",
    width: "140px", height: "60px", background: "#2E4A8F", borderRadius: "4px" });
  const paddle = prop(sc, "soft", { left: "490px", top: "596px", width: "150px", height: "64px",
    background: "#F0D060", borderRadius: "6px", boxShadow: "0 0 26px rgba(240,208,96,0.8)",
    transition: "left 0.7s ease-in-out" });

  const ball = prop(sc, "circle soft", { left: "560px", top: "560px", width: "42px", height: "42px",
    background: "radial-gradient(circle at 35% 28%, #fff, #D8DCE8)", transition: "all 0.8s linear" });
  sc.classList.add("on");
  await sleep(800);

  // ball up, breaks brick 4
  ball.style.left = "660px"; ball.style.top = "70px";
  await sleep(820);
  bricks[4].style.transition = "all 0.3s"; bricks[4].style.transform = "scale(0)";
  sparkle(720, 60, 8); h.set(0, 1);
  // rebound down-left
  ball.style.left = "360px"; ball.style.top = "560px";
  // drag paddle to catch
  await drag(565, 628, 400, 628, 700, paddle);
  await sleep(200);
  // bounce again, breaks brick 2
  ball.style.left = "370px"; ball.style.top = "70px";
  await sleep(820);
  bricks[2].style.transition = "all 0.3s"; bricks[2].style.transform = "scale(0)";
  sparkle(420, 60, 8); h.set(0, 2);
  ball.style.left = "600px"; ball.style.top = "620px";
  await sleep(1100);
};

/* ── 6. Explore · Busy Town (ss07) ── */
SCENES["busy-town"] = async () => {
  await titleCard("Explore", "Busy Town", "Tap the lights. Watch the town go.", ["#6FA8DC", "#E05A5A", "#5CAF5F", "#F0D060"]);
  const sc = $("#scene");
  sc.style.background = "linear-gradient(180deg,#B8DCF5 0%,#C8E4F8 60%,#8A8F98 60%)";
  hud(sc, [["🚗", 0]]);

  // sun + clouds
  const sun = prop(sc, "circle", { left: "1080px", top: "50px", width: "90px", height: "90px",
    background: "#F0D060", boxShadow: "0 0 60px rgba(240,208,96,0.9)" });
  prop(sc, "floaty", { left: "220px", top: "50px", fontSize: "70px" }, "☁️");
  prop(sc, "floaty", { left: "620px", top: "80px", fontSize: "56px", animationDelay: "0.8s" }, "☁️");

  // houses
  const house = (x, body, roof) => { const hd = prop(sc, null, { left: x + "px", top: "150px", width: "230px", height: "246px" });
    prop(hd, null, { left: "0", top: "56px", width: "230px", height: "190px", background: body });
    prop(hd, null, { left: "-16px", top: "-10px", width: "0", height: "0",
      borderLeft: "131px solid transparent", borderRight: "131px solid transparent",
      borderBottom: "70px solid " + roof });
    prop(hd, null, { left: "28px", top: "86px", width: "54px", height: "54px", background: "#F0D060" });
    prop(hd, null, { left: "140px", top: "86px", width: "54px", height: "54px", background: "#2A3A6A" });
    prop(hd, null, { left: "86px", top: "160px", width: "60px", height: "86px", background: "#1E3A7A" }); };
  house(130, "linear-gradient(180deg,#B5854E,#8F6234)", "#6B3F1A");
  house(950, "linear-gradient(180deg,#5A9BD4,#3D7AB8)", "#2A5A94");

  // traffic light
  const pole = prop(sc, null, { left: "560px", top: "210px", width: "10px", height: "186px", background: "#333" });
  const box = prop(sc, "soft", { left: "537px", top: "160px", width: "56px", height: "120px",
    background: "#222", borderRadius: "10px" });
  const lampR = prop(box, "circle", { left: "13px", top: "12px", width: "30px", height: "30px", background: "#5A2A2A" });
  const lampG = prop(box, "circle", { left: "13px", top: "74px", width: "30px", height: "30px",
    background: "#5CAF5F", boxShadow: "0 0 18px #5CAF5F" });

  // cars
  const car = (x, color, dir) => { const c = prop(sc, null, { left: x + "px", top: "348px", width: "150px",
    height: "60px", transition: "left 2.2s ease-in-out" });
    prop(c, "soft", { left: "0", top: "14px", width: "150px", height: "46px", background: color, borderRadius: "14px" });
    prop(c, null, { left: "30px", top: "-8px", width: "80px", height: "30px", background: color,
      borderRadius: "10px 10px 0 0" });
    prop(c, "circle", { left: "18px", top: "48px", width: "26px", height: "26px", background: "#222" });
    prop(c, "circle", { left: "106px", top: "48px", width: "26px", height: "26px", background: "#222" });
    return c; };
  const redCar = car(180, "#E06070", 1);
  const blueCar = car(1010, "#5A9BD4", 1);
  // road stripes
  for (let i = 0; i < 12; i++) prop(sc, null, { left: 20 + i * 125 + "px", top: "440px",
    width: "60px", height: "10px", background: "#F0D060", borderRadius: "4px" });
  sc.classList.add("on");
  await sleep(900);

  // cars drive
  redCar.style.left = "480px"; blueCar.style.left = "660px";
  await sleep(2300);
  // tap light -> red, cars stop (wiggle)
  await touch(565, 186);
  lampG.style.background = "#2A4A2A"; lampG.style.boxShadow = "none";
  lampR.style.background = "#E05A5A"; lampR.style.boxShadow = "0 0 18px #E05A5A";
  await sleep(900);
  // tap again -> green, cars go on
  await touch(565, 250);
  lampR.style.background = "#5A2A2A"; lampR.style.boxShadow = "none";
  lampG.style.background = "#5CAF5F"; lampG.style.boxShadow = "0 0 18px #5CAF5F";
  redCar.style.left = "1300px"; blueCar.style.left = "-160px";
  sun.classList.add("wiggle");
  await sleep(1600);
};

/* ── 7. Pour · Water Play (ss08) ── */
SCENES["water-play"] = async () => {
  await titleCard("Pour", "Water Play", "Fill every cup, drop by drop", ["#4AB8E8", "#F0A050", "#B5854E", "#fff"]);
  const sc = $("#scene");
  sc.style.background = "linear-gradient(180deg,#A5713C,#7E5426)";
  const h = hud(sc, [["💧", 1], ["🏆", 1]]);

  // fountain
  const ftn = prop(sc, null, { left: "110px", top: "260px", width: "120px", height: "120px" });
  prop(ftn, null, { left: "48px", top: "20px", width: "16px", height: "70px", background: "#1A5A7A" });
  prop(ftn, "soft", { left: "10px", top: "88px", width: "100px", height: "22px", background: "#C8D8E0", borderRadius: "4px" });
  const spray = prop(ftn, null, { left: "20px", top: "-30px", fontSize: "40px", opacity: "0" }, "💦");

  // cups pyramid (bottom row of 4, mid 3, top 1 simplified)
  const cup = (x, y) => prop(sc, null, { left: x + "px", top: y + "px", width: "74px", height: "92px",
    background: "linear-gradient(180deg,#EFE8DC,#CBBFA8)", clipPath: "polygon(6% 0,94% 0,82% 100%,18% 100%)",
    transition: "all 0.4s" });
  const cups = [cup(520, 470), cup(680, 470), cup(840, 470), cup(1000, 470),
    cup(600, 300), cup(760, 300), cup(920, 300), cup(760, 130)];
  sc.classList.add("on");
  await sleep(900);

  // tap fountain, drops fly to cups, fill them one by one
  for (let i = 0; i < 3; i++) {
    await touch(170, 330, 320);
    spray.style.opacity = "1"; spray.classList.add("pop-in");
    const d = prop(sc, null, { left: "180px", top: "260px", fontSize: "34px",
      transition: "all 0.9s cubic-bezier(0.3,0,0.6,1)" }, "💧");
    await sleep(80);
    const target = cups[i];
    d.style.left = parseFloat(target.style.left) + 20 + "px";
    d.style.top = parseFloat(target.style.top) - 30 + "px";
    await sleep(950);
    d.remove();
    target.style.background = "linear-gradient(180deg,#7ACCF0,#4AB8E8)";
    target.style.boxShadow = "0 0 26px rgba(122,204,240,0.8)";
    sparkle(parseFloat(target.style.left) + 37, parseFloat(target.style.top), 5, "💧");
    h.set(0, i + 2);
    spray.style.opacity = "0"; spray.classList.remove("pop-in");
    await sleep(280);
  }
  await sleep(1100);
};

/* ── 8. Fill · Colors & Patterns (ss09) ── */
SCENES["colors-patterns"] = async () => {
  await titleCard("Fill", "Colors & Patterns", "Pick a color. Bring art to life.", ["#E05A5A", "#F0D060", "#6FA8DC", "#5CAF5F"]);
  const sc = $("#scene");
  sc.style.background = "linear-gradient(180deg,#3A4454,#2C3440)";
  const h = hud(sc, [["🎨", 2], ["🏆", 2]]);

  // stencils
  const bird = prop(sc, null, { left: "270px", top: "90px", fontSize: "120px",
    filter: "grayscale(1) brightness(2.2) opacity(0.75)", transition: "filter 0.5s" }, "🐦");
  const tree = prop(sc, null, { left: "660px", top: "80px", fontSize: "124px",
    filter: "grayscale(1) brightness(2.2) opacity(0.75)", transition: "filter 0.5s" }, "🌳");
  prop(sc, null, { left: "1040px", top: "86px", fontSize: "118px",
    filter: "grayscale(1) brightness(2.2) opacity(0.75)" }, "🥚");

  // wells under stencils
  const well = (x) => prop(sc, "circle", { left: x + "px", top: "300px", width: "88px", height: "88px",
    background: "#fff", border: "6px solid #E8DCC0", transition: "all 0.4s" });
  const wBird = well(292), wTree = well(688); well(1062);

  // palette
  const pal = (x, c) => prop(sc, "circle soft", { left: x + "px", top: "540px", width: "84px",
    height: "84px", background: c, border: "5px solid #fff" });
  pal(520, "#D05A5A"); const palY = pal(650, "#E8C84A"); const palB = pal(780, "#6FA8DC");
  prop(sc, "circle soft", { left: "910px", top: "540px", width: "84px", height: "84px",
    background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }, "↩");
  sc.classList.add("on");
  await sleep(900);

  // pick blue -> tap bird well -> bird colors in
  await touch(822, 582);
  palB.style.transform = "scale(1.15)"; palB.style.boxShadow = "0 0 24px #6FA8DC";
  await sleep(400);
  await touch(336, 344);
  wBird.style.background = "#6FA8DC";
  bird.style.filter = "none";
  sparkle(330, 170, 7);
  h.set(0, 3);
  await sleep(900);

  // pick yellow -> tap tree well
  await touch(692, 582);
  palB.style.transform = ""; palB.style.boxShadow = "";
  palY.style.transform = "scale(1.15)"; palY.style.boxShadow = "0 0 24px #E8C84A";
  await sleep(400);
  await touch(732, 344);
  wTree.style.background = "#E8C84A";
  tree.style.filter = "none";
  sparkle(724, 160, 7);
  h.set(0, 4);
  await sleep(1300);
};

/* ── 9. Fly · Rocket Dash (ss10) ── */
SCENES["rocket-dash"] = async () => {
  await titleCard("Fly", "Rocket Dash", "Dodge the rocks. Catch the stars.", ["#E05A5A", "#F0D060", "#2A3A6A", "#fff"]);
  const sc = $("#scene");
  sc.style.background = "linear-gradient(180deg,#141B36,#0E1226)";
  const h = hud(sc, [["⭐", 0]]);

  // stars
  for (let i = 0; i < 40; i++) prop(sc, "circle", { left: Math.random() * 1400 + "px",
    top: Math.random() * 640 + "px", width: "4px", height: "4px", background: "#fff",
    opacity: 0.3 + Math.random() * 0.6 });
  // gold dot ring
  const ringDots = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2;
    ringDots.push(prop(sc, "circle", { left: 640 + Math.cos(a) * 60 + "px",
      top: 300 + Math.sin(a) * 60 + "px", width: "12px", height: "12px", background: "#D8B860" })); }
  // asteroids
  const ast = (x, y, s) => prop(sc, "floaty", { left: x + "px", top: y + "px", fontSize: s + "px",
    filter: "hue-rotate(-20deg) saturate(0.8)" }, "🪨");
  ast(180, 120, 84); ast(240, 420, 100); const a3 = ast(820, 470, 90); ast(1120, 180, 70);

  // rocket
  const rocket = prop(sc, null, { left: "1150px", top: "90px", fontSize: "100px",
    transform: "rotate(45deg)", transition: "left 1.3s ease-in-out, top 1.3s ease-in-out" }, "🚀");
  sc.classList.add("on");
  await sleep(900);

  // drag rocket through the gold ring
  await drag(1190, 150, 660, 300, 1300, null);
  rocket.style.left = "600px"; rocket.style.top = "250px";
  await sleep(1000);
  ringDots.forEach((d) => { d.style.transition = "all 0.4s"; d.style.transform = "scale(0)"; });
  sparkle(660, 300, 9, "⭐");
  h.set(0, 1);
  await sleep(600);

  // dodge asteroid — swoop under
  await drag(660, 310, 420, 180, 1200, null);
  rocket.style.left = "360px"; rocket.style.top = "130px";
  a3.classList.add("wiggle");
  await sleep(1500);
};

/* ── 10. Discover · Sensory Shapes (ss11) ── */
SCENES["sensory-shapes"] = async () => {
  await titleCard("Discover", "Sensory Shapes", "Every tap answers back", ["#6FA8DC", "#F0A050", "#E05A5A", "#B08FD8"]);
  const sc = $("#scene");
  sc.style.background = "linear-gradient(180deg,#5A3E8C,#46306E)";
  const h = hud(sc, [["🎯", 0], ["🏆", 2]]);

  const circ = prop(sc, "circle soft", { left: "250px", top: "150px", width: "180px", height: "180px",
    background: "radial-gradient(circle at 38% 30%, #8CC8F0, #3A88C8)", border: "12px solid #2A6AA8",
    transition: "transform 0.3s" });
  const tri = prop(sc, null, { left: "890px", top: "120px", width: "0", height: "0",
    borderLeft: "110px solid transparent", borderRight: "110px solid transparent",
    borderBottom: "190px solid #F0A050", transition: "transform 0.3s" });
  const sq = prop(sc, "soft", { left: "570px", top: "360px", width: "170px", height: "170px",
    background: "linear-gradient(135deg,#F08080,#D04858)", border: "4px solid #B03848",
    transition: "transform 0.5s" });
  sc.classList.add("on");
  await sleep(900);

  // tap circle -> pulse rings
  await touch(340, 240);
  circ.style.transform = "scale(1.14)";
  sparkle(340, 240, 6, "💠");
  h.set(0, 1);
  setTimeout(() => (circ.style.transform = ""), 350);
  await sleep(900);

  // tap triangle -> wiggle
  await touch(1000, 240);
  tri.classList.add("wiggle");
  sparkle(1000, 220, 6, "🔶");
  h.set(0, 2);
  await sleep(900);

  // tap square -> spin
  await touch(655, 445);
  sq.style.transform = "rotate(90deg) scale(1.1)";
  sparkle(655, 445, 6, "❤️");
  h.set(0, 3);
  setTimeout(() => (sq.style.transform = ""), 600);
  await sleep(1400);
};

/* ── 11. Glow · Light Play (ss12) ── */
SCENES["light-play"] = async () => {
  await titleCard("Glow", "Light Play", "Switches, dials, and gentle light", ["#F0D060", "#5CAF5F", "#6FA8DC", "#F0A050"]);
  const sc = $("#scene");
  sc.style.background = "linear-gradient(180deg,#14161E,#0E1016)";
  const h = hud(sc, [["💡", 1], ["🏆", 1]]);

  // lamp 1: red ball + plug
  const ball = prop(sc, "circle", { left: "220px", top: "110px", width: "150px", height: "150px",
    background: "#5A2E2E", transition: "all 0.5s" });
  const plug = prop(sc, "soft", { left: "150px", top: "320px", width: "80px", height: "70px",
    background: "#EFE6D0", border: "3px solid #999", borderRadius: "6px", display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: "30px" }, "🔌");
  // lamp 2: yellow square + push button
  const sqr = prop(sc, "soft", { left: "640px", top: "100px", width: "160px", height: "160px",
    background: "#4A452E", borderRadius: "10px", transition: "all 0.5s" });
  const btn = prop(sc, "soft", { left: "690px", top: "330px", width: "70px", height: "90px",
    background: "#3A3A44", borderRadius: "8px", display: "flex", alignItems: "center",
    justifyContent: "center" }, '<div style="width:36px;height:24px;background:#EEE"></div>');
  // lamp 3: green diamond + toggle
  const dia = prop(sc, null, { left: "1090px", top: "110px", width: "140px", height: "140px",
    background: "#2E4A32", transform: "rotate(45deg)", borderRadius: "14px", transition: "all 0.5s" });
  const tog = prop(sc, null, { left: "1110px", top: "340px", width: "96px", height: "44px",
    background: "#3A3A44", borderRadius: "999px", transition: "all 0.3s" });
  const knob = prop(tog, "circle", { left: "4px", top: "4px", width: "36px", height: "36px",
    background: "#DDD", transition: "left 0.3s" });
  sc.classList.add("on");
  await sleep(900);

  // plug in -> red glows
  await touch(190, 355);
  plug.classList.add("wiggle");
  ball.style.background = "radial-gradient(circle at 38% 30%, #FFAFAF, #E05A5A)";
  ball.style.boxShadow = "0 0 90px 30px rgba(224,90,90,0.55)";
  h.set(0, 2);
  await sleep(1000);

  // push button -> yellow glows
  await touch(725, 375);
  sqr.style.background = "linear-gradient(135deg,#FFF2B0,#F0D060)";
  sqr.style.boxShadow = "0 0 100px 34px rgba(240,208,96,0.5)";
  h.set(0, 3);
  await sleep(1000);

  // flip toggle -> green glows
  await touch(1158, 362);
  knob.style.left = "56px"; tog.style.background = "#5CAF5F";
  dia.style.background = "linear-gradient(135deg,#C8F0C8,#5CAF5F)";
  dia.style.boxShadow = "0 0 100px 34px rgba(92,175,95,0.5)";
  h.set(0, 4);
  await sleep(1600);
};

/* ── 12. Explore · Nature & Animals (ss13) ── */
SCENES["nature-animals"] = async () => {
  await titleCard("Explore", "Nature & Animals", "Rain, apples, and a peekaboo bear", ["#6FA8DC", "#5CAF5F", "#E05A5A", "#8B5C2A"]);
  const sc = $("#scene");
  sc.style.background = "linear-gradient(180deg,#A8D4F0 0%,#8CC8EE 56%,#6FBF73 56%)";
  const h = hud(sc, [["🍎", 0]]);

  // clouds
  const cloud = (x) => prop(sc, "floaty", { left: x + "px", top: "50px", fontSize: "120px" }, "☁️");
  const c1 = cloud(220); cloud(620); cloud(1010);
  prop(sc, "circle", { left: "1180px", top: "60px", width: "80px", height: "80px",
    background: "#F0D060", boxShadow: "0 0 50px rgba(240,208,96,0.8)" });

  // bushes
  const bush = (x) => prop(sc, null, { left: x + "px", top: "380px", fontSize: "170px",
    lineHeight: "1", zIndex: "3" }, "🌳");
  // bear hiding behind bush 3 (lower z-index, rises above the bush top when tapped)
  const bear = prop(sc, null, { left: "1060px", top: "470px", fontSize: "76px", zIndex: "2",
    transition: "top 0.6s cubic-bezier(0.2,1.3,0.4,1)" }, "🐻");
  bush(190); const b2 = bush(590); bush(990);
  sc.classList.add("on");
  await sleep(900);

  // tap cloud -> rain -> apple grows
  await touch(290, 120);
  const drops = [];
  for (let i = 0; i < 5; i++) drops.push(prop(sc, null, { left: 250 + i * 34 + "px", top: "170px",
    fontSize: "26px", transition: "top 1s linear, opacity 1s" }, "💧"));
  await sleep(80);
  drops.forEach((d) => (d.style.top = "380px"));
  await sleep(1000);
  drops.forEach((d) => d.remove());
  const apple = prop(sc, "pop-in", { left: "250px", top: "440px", fontSize: "44px" }, "🍎");
  sparkle(275, 450, 6);
  h.set(0, 1);
  await sleep(800);

  // tap bush 3 -> bear peeks up
  await touch(1090, 470);
  bear.style.top = "330px";
  b2.classList.add("wiggle");
  sparkle(1100, 350, 6, "💛");
  await sleep(1000);
  bear.style.top = "470px";
  await sleep(1200);
};

/* ── 13. Float · Balloon Rise (ss14) ── */
SCENES["balloon-rise"] = async () => {
  await titleCard("Float", "Balloon Rise", "Pop and count, one by one", ["#F2A0B5", "#5CAF5F", "#6FA8DC", "#F0D060"]);
  const sc = $("#scene");
  sc.style.background = "linear-gradient(180deg,#BDE0F5,#E8F4FB)";
  const h = hud(sc, [["🎈", 1], ["🏆", 4]]);

  for (const [x, y, s] of [[200, 70, 78], [560, 40, 60], [940, 90, 66], [1180, 50, 72]])
    prop(sc, "floaty", { left: x + "px", top: y + "px", fontSize: s + "px" }, "☁️");

  const num = prop(sc, null, { left: "660px", top: "250px", fontSize: "120px",
    fontFamily: '"Fredoka One",cursive', color: "#D8A840",
    textShadow: "0 5px 0 rgba(0,0,0,0.12)", transition: "transform 0.3s" }, "1");

  const balloon = (x, color) => { const b = prop(sc, null, { left: x + "px", top: "660px",
    width: "110px", height: "140px",
    background: `radial-gradient(circle at 36% 26%, #fff8, ${color})`,
    borderRadius: "50% 50% 48% 48%", transition: "top 2.6s ease-out" });
    prop(b, null, { left: "52px", top: "138px", width: "3px", height: "56px", background: "#9995" });
    return b; };
  const pink = balloon(420, "#F2A0B5");
  const green = balloon(880, "#5CAF5F");
  sc.classList.add("on");
  await sleep(300);
  pink.style.top = "220px"; green.style.top = "300px";
  await sleep(2400);

  // pop pink -> count 2
  await touch(475, 290);
  pink.style.transition = "transform 0.2s"; pink.style.transform = "scale(0)";
  sparkle(475, 290, 9, "🎉");
  num.textContent = "2"; num.style.transform = "scale(1.3)";
  setTimeout(() => (num.style.transform = ""), 300);
  h.set(0, 2);
  await sleep(1100);

  // pop green -> count 3
  await touch(935, 370);
  green.style.transition = "transform 0.2s"; green.style.transform = "scale(0)";
  sparkle(935, 370, 9, "🎉");
  num.textContent = "3"; num.style.transform = "scale(1.3)";
  setTimeout(() => (num.style.transform = ""), 300);
  h.set(0, 3);
  await sleep(1500);
};

/* ── 14. Create · Silly Faces (ss15) ── */
SCENES["silly-faces"] = async () => {
  await titleCard("Create", "Silly Faces", "Googly eyes and giggles", ["#F0A050", "#B08FD8", "#E05A5A", "#5CAF5F"]);
  const sc = $("#scene");
  sc.style.background = "linear-gradient(180deg,#F5EDDC,#EFE4CC)";
  hud(sc, [["😊", 0]]);

  // tray
  const tray = prop(sc, "soft", { left: "360px", top: "540px", width: "716px", height: "94px",
    background: "#FBF6EA", borderRadius: "999px", display: "flex", alignItems: "center",
    justifyContent: "space-around", padding: "0 30px", border: "2px solid #E8DCC4" });
  ["👀", "〰️", "🔴", "🟡", "⭐"].forEach((g) => {
    const b = el("div", null, g);
    Object.assign(b.style, { fontSize: "44px", background: "#fff", borderRadius: "50%",
      width: "72px", height: "72px", display: "flex", alignItems: "center",
      justifyContent: "center", boxShadow: "0 3px 10px rgba(0,0,0,0.08)" });
    tray.appendChild(b);
  });
  sc.classList.add("on");
  await sleep(900);

  const face = prop(sc, null, { left: "540px", top: "60px", width: "360px", height: "420px" });

  // eyes
  await touch(452, 587);
  const eye = (x) => { const e = prop(face, "circle soft pop-in", { left: x + "px", top: "120px",
    width: "74px", height: "74px", background: "radial-gradient(circle at 40% 32%, #FFD9A0, #C87830)",
    border: "5px solid #EEE" });
    prop(e, "circle", { left: "22px", top: "24px", width: "26px", height: "26px", background: "#231a10" });
    return e; };
  eye(70); await sleep(350); eye(210);
  await sleep(650);

  // mouth
  await touch(590, 587);
  prop(face, "pop-in", { left: "110px", top: "270px", width: "130px", height: "64px",
    border: "16px solid #E05A6A", borderTop: "none", borderRadius: "0 0 130px 130px" });
  await sleep(700);

  // eyebrows (purple squiggles)
  await touch(727, 587);
  prop(face, "pop-in", { left: "48px", top: "62px", width: "110px", height: "30px",
    border: "12px solid #B08FD8", borderBottom: "none", borderRadius: "110px 110px 0 0",
    transform: "rotate(-8deg)" });
  await sleep(300);
  prop(face, "pop-in", { left: "196px", top: "58px", width: "110px", height: "30px",
    border: "12px solid #F2A0B5", borderBottom: "none", borderRadius: "110px 110px 0 0",
    transform: "rotate(8deg)" });
  await sleep(700);

  // star sticker + celebrate
  await touch(1000, 587);
  prop(face, "pop-in", { left: "300px", top: "-20px", fontSize: "70px", transform: "rotate(14deg)" }, "⭐");
  await sleep(500);
  face.classList.add("wiggle");
  sparkle(720, 250, 10, "🎉");
  await sleep(1400);
};

/* runner */
(async () => {
  buildStage();
  const name = new URLSearchParams(location.search).get("scene");
  await SCENES[name]();
  await endCard();
  finish();
})();
