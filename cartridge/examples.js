export const EXAMPLE_CARTRIDGES = [
  {
    title: "StoopSwipe",
    tagline: "Grab curb finds before your tote fills up.",
    payload: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>StoopSwipe</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #10211d; color: #fff7ed; display: grid; place-items: center; font-family: system-ui, sans-serif; padding: 18px; }
    main { width: min(440px, 100%); border: 1px solid #2dd4bf; border-radius: 10px; padding: 18px; background: #132f2a; box-shadow: 0 18px 40px #0008; }
    h1 { margin: 0; font-size: 30px; }
    .card { min-height: 190px; display: grid; align-content: center; gap: 8px; border: 1px solid #3f5f57; border-radius: 8px; margin: 16px 0; padding: 18px; background: #fff7ed; color: #10211d; }
    .item { font-size: 30px; font-weight: 900; }
    .meta { color: #475569; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    button { border: 0; border-radius: 8px; padding: 12px; font: inherit; font-weight: 900; color: #10211d; background: #5eead4; }
    button.pass { background: #fed7aa; }
    .score { display: flex; justify-content: space-between; color: #ccfbf1; font-weight: 800; }
  </style>
</head>
<body>
  <main>
    <h1>StoopSwipe</h1>
    <p>Build the best curb haul. Value scores, mystery stains subtract.</p>
    <div class="score"><span id="round"></span><span id="score"></span></div>
    <section class="card">
      <div class="item" id="item"></div>
      <div class="meta" id="meta"></div>
    </section>
    <div class="row">
      <button class="pass" onclick="choose(false)">Pass</button>
      <button onclick="choose(true)">Grab</button>
    </div>
  </main>
  <script>
    const finds = [
      ["bent bistro chair", 7, "repairable, charming"],
      ["mystery humidifier", -6, "wet cord, bad vibes"],
      ["milk crate of art books", 10, "heavy but elite"],
      ["tiny marble table", 14, "three blocks from home"],
      ["broken air fryer", -8, "do not become this person"],
      ["lamp with one perfect shade", 9, "bagel shop lighting"]
    ];
    let i = 0;
    let score = 0;
    function draw() {
      if (i >= finds.length) {
        document.getElementById("item").textContent = score >= 25 ? "Legendary stoop run" : "Respectable haul";
        document.getElementById("meta").textContent = "Final score: " + score;
        parent.postMessage({type:"cartridge-result", text:"StoopSwipe score " + score}, "*");
        return;
      }
      document.getElementById("round").textContent = "Find " + (i + 1) + " / " + finds.length;
      document.getElementById("score").textContent = "Score " + score;
      document.getElementById("item").textContent = finds[i][0];
      document.getElementById("meta").textContent = finds[i][2];
    }
    function choose(grab) {
      if (grab && i < finds.length) score += finds[i][1];
      i += 1;
      draw();
    }
    draw();
  </script>
</body>
</html>`,
  },
  {
    title: "Lunch Special Radar",
    tagline: "Read the clues, find the best plate.",
    payload: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lunch Special Radar</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #172033; color: #f8fafc; font-family: system-ui, sans-serif; display: grid; place-items: center; padding: 18px; }
    main { width: min(460px, 100%); border: 1px solid #7dd3fc; border-radius: 10px; padding: 18px; background: #0f172a; }
    h1 { margin: 0 0 6px; }
    .clue { background: #f8fafc; color: #0f172a; border-radius: 8px; padding: 16px; min-height: 112px; font-size: 20px; font-weight: 850; display: grid; place-items: center; text-align: center; }
    .choices { display: grid; gap: 10px; margin-top: 14px; }
    button { border: 0; border-radius: 8px; padding: 12px; font: inherit; font-weight: 850; background: #38bdf8; color: #082f49; }
    #result { min-height: 24px; color: #bae6fd; font-weight: 800; }
  </style>
</head>
<body>
  <main>
    <h1>Lunch Special Radar</h1>
    <p>Pick the best lunch from weak signals. Three rounds.</p>
    <div class="clue" id="clue"></div>
    <div class="choices" id="choices"></div>
    <p id="result"></p>
  </main>
  <script>
    const rounds = [
      { clue: "Handwritten sign, cash only, steam in the window.", options: ["Dumpling combo", "Truffle slider", "Desk salad"], answer: 0 },
      { clue: "Office workers carrying identical foil trays at 12:08.", options: ["Buffet by weight", "Museum cafe", "Cupcake kiosk"], answer: 0 },
      { clue: "Tiny awning, two delivery bikes, one grandma at the register.", options: ["Soup and rice", "Airport sushi", "Protein cookie"], answer: 0 }
    ];
    let round = 0;
    let score = 0;
    function draw() {
      if (round >= rounds.length) {
        document.getElementById("clue").textContent = score === 3 ? "Radar calibrated." : "Radar needs seasoning.";
        document.getElementById("choices").replaceChildren();
        document.getElementById("result").textContent = "Score " + score + " / " + rounds.length;
        parent.postMessage({type:"cartridge-result", text:"Lunch score " + score}, "*");
        return;
      }
      const item = rounds[round];
      document.getElementById("clue").textContent = item.clue;
      const choices = document.getElementById("choices");
      choices.replaceChildren();
      item.options.forEach((label, index) => {
        const button = document.createElement("button");
        button.textContent = label;
        button.onclick = () => pick(index);
        choices.append(button);
      });
    }
    function pick(index) {
      const item = rounds[round];
      if (index === item.answer) {
        score += 1;
        document.getElementById("result").textContent = "Good read.";
      } else {
        document.getElementById("result").textContent = "Tourist trap detected too late.";
      }
      round += 1;
      setTimeout(draw, 650);
    }
    draw();
  </script>
</body>
</html>`,
  },
  {
    title: "Last Call",
    tagline: "Route three urgent stops before everything closes.",
    payload: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Last Call</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #201327; color: #fff7ed; display: grid; place-items: center; font-family: system-ui, sans-serif; padding: 18px; }
    main { width: min(460px, 100%); background: #321b3f; border: 1px solid #f0abfc; border-radius: 10px; padding: 18px; }
    h1 { margin: 0; font-size: 32px; }
    .hud { display: flex; justify-content: space-between; gap: 10px; margin: 12px 0; color: #f5d0fe; font-weight: 900; }
    .log { min-height: 116px; background: #fff7ed; color: #201327; border-radius: 8px; padding: 14px; font-weight: 800; line-height: 1.45; }
    .stops { display: grid; gap: 10px; margin-top: 12px; }
    button { border: 0; border-radius: 8px; padding: 12px; font: inherit; font-weight: 900; background: #f0abfc; color: #3b0764; }
  </style>
</head>
<body>
  <main>
    <h1>Last Call</h1>
    <p>It is 10:42. You need food, meds, and the train before the city shrinks.</p>
    <div class="hud"><span id="time"></span><span id="score"></span></div>
    <div class="log" id="log"></div>
    <div class="stops" id="stops"></div>
  </main>
  <script>
    const stops = [
      ["slice counter", 9, 8, "Hot slice acquired."],
      ["pharmacy aisle", 14, 10, "Tiny toothpaste secured."],
      ["express platform", 11, 12, "Train doors still open."],
      ["fancy gelato", 18, -6, "Delicious, fatal detour."]
    ];
    let minutes = 38;
    let score = 0;
    let visits = 0;
    function draw(message) {
      document.getElementById("time").textContent = minutes + " min left";
      document.getElementById("score").textContent = "Score " + score;
      document.getElementById("log").textContent = message || "Choose carefully. Three good stops wins.";
      const box = document.getElementById("stops");
      box.replaceChildren();
      if (minutes <= 0 || visits >= 3) {
        const won = score >= 25 && minutes >= 0;
        document.getElementById("log").textContent = won ? "You made the night work." : "The city closed one stop too soon.";
        parent.postMessage({type:"cartridge-result", text:"Last Call score " + score}, "*");
        return;
      }
      stops.forEach((stop, index) => {
        const button = document.createElement("button");
        button.textContent = stop[0] + " -" + stop[1] + "m";
        button.onclick = () => visit(index);
        box.append(button);
      });
    }
    function visit(index) {
      const stop = stops[index];
      minutes -= stop[1];
      score += stop[2];
      visits += 1;
      draw(stop[3]);
    }
    draw();
  </script>
</body>
</html>`,
  },
];
