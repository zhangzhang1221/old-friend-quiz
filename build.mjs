import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { meta, chapters, characters, questions, pairs } from "./src/data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname);
const CH = Object.fromEntries(characters.map((c) => [c.id, c]));
const PAD = (n) => String(n).padStart(2, "0");

/* ── data checks ───────────────────────────────────────────── */
const prim = {},
  sec = {};
characters.forEach((c) => {
  prim[c.id] = 0;
  sec[c.id] = 0;
});
const problems = [];
questions.forEach((q, qi) => {
  if (q.options.length !== 4) problems.push(`Q${qi + 1}: expected 4 options`);
  const seen = new Set();
  const perChar = {};
  q.options.forEach((o) => {
    Object.keys(o.w).forEach((id) => {
      perChar[id] = (perChar[id] || 0) + 1;
      if (perChar[id] > 1) problems.push(`Q${qi + 1}: ${id} appears twice`);
    });
  });
  q.options.forEach((o, oi) => {
    const entries = Object.entries(o.w).sort((a, b) => b[1] - a[1]);
    if (entries.length !== 2) problems.push(`Q${qi + 1}.${oi}: expected 2 weights`);
    const [[pid, pv], [sid, sv]] = entries;
    if (pv !== 2 || sv !== 1) problems.push(`Q${qi + 1}.${oi}: weights ${JSON.stringify(o.w)}`);
    if (seen.has(pid)) problems.push(`Q${qi + 1}.${oi}: duplicate primary ${pid}`);
    seen.add(pid);
    prim[pid] += 1;
    sec[sid] += 1;
  });
});
Object.keys(prim).forEach((id) => {
  if (prim[id] !== 8 || sec[id] !== 8) problems.push(`${id}: primary ${prim[id]} / secondary ${sec[id]}`);
});
if (problems.length) {
  console.error("DATA PROBLEMS:\n" + problems.join("\n"));
  process.exit(1);
}
const MAX = 24;

/* ── index.html ────────────────────────────────────────────── */
const payload = JSON.stringify({ meta, chapters, characters, questions, pairs });
const appTemplate = fs.readFileSync(path.join(root, "src", "app.html"), "utf8");
if (!appTemplate.includes("__DATA__")) throw new Error("app template missing __DATA__");
fs.writeFileSync(path.join(root, "index.html"), appTemplate.replace("__DATA__", payload));

/* ── print.html ────────────────────────────────────────────── */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const sheets = [];
function addSheet(label, body, cls = "", noFoot = false, style = "", noHead = false) {
  sheets.push({ label, body, cls, noFoot, style, noHead });
}

/* cover */
addSheet(
  "封面",
  `<div class="cover-top">
    <p class="kicker">非官方二创 · 娱乐向人格测试</p>
    <h1>后会<span class="hit">友</span>期</h1>
    <p class="cover-sub">旧友人格测试</p>
    <p class="cover-lead">你们是怎么走散的，<br>又该怎么走回来。</p>
  </div>
  <div class="cover-body">
    <div class="cover-text">${meta.intro.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
    <div class="howto">
      <h3>怎么玩</h3>
      <ol>
        <li>十六道题，每题只选一个：选你<b>第一反应</b>会做的那一个，不要选“应该做”的那一个。</li>
        <li>题目按“重逢—同行—对质—和解”四章推进，场景都改编自节目里的真实处境。</li>
        <li>每题末尾勾下你的选择，翻到第 6 页计分：主选 2 分、次选 1 分，最高分就是你的旧友人格。</li>
        <li>第 7 页起是八种人格的完整解析，也可以先读解析，再回头做题。</li>
      </ol>
    </div>
    <div class="cover-meta"><span>16 道题</span><span>8 种人格</span><span>4 组关系</span><span>约 4 分钟</span></div>
  </div>
  <p class="cover-note">${esc(meta.note)}</p>`,
  "cover",
  true,
  "",
  true
);

/* questions, one chapter per page */
chapters.forEach((ch, ci) => {
  const list = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => q.chapter === ci)
    .map(({ q, i }) => {
      const opts = q.options
        .map((o, k) => `<p class="opt"><i>${"ABCD"[k]}</i><span>${esc(o.text)}</span></p>`)
        .join("");
      return `<div class="q">
        <p class="qtext"><b>${PAD(i + 1)}</b><span>${esc(q.text)}</span></p>
        <div class="opts">${opts}</div>
        <p class="pick">我的选择　○ A　○ B　○ C　○ D</p>
      </div>`;
    })
    .join("");
  addSheet(
    "第一部分 · 题目",
    `<h2 class="chapter">${ch.name}</h2>
     <p class="chapter-sub">${esc(ch.sub)}</p>
     ${list}`,
    "qpage"
  );
});

/* score */
const scoreRows = questions
  .map((q, qi) => {
    const cells = q.options
      .map((o) => {
        const entries = Object.entries(o.w).sort((a, b) => b[1] - a[1]);
        return `<td><b>${CH[entries[0][0]].name}</b><br>${CH[entries[1][0]].name}</td>`;
      })
      .join("");
    return `<tr><th>${PAD(qi + 1)}</th>${cells}</tr>`;
  })
  .join("");

addSheet(
  "第二部分 · 计分",
  `<h2 class="sec">计分表</h2>
   <p class="lead">每一格有两个名字：<b>加粗的是主选，记 2 分</b>；下面那个是次选，记 1 分。把十六道题的勾选逐题累加，八位角色各自的满分是 24 分。</p>
   <table class="score">
     <thead><tr><th>题号</th><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead>
     <tbody>${scoreRows}</tbody>
   </table>
   <div class="score-how">
     <h3>怎么读结果</h3>
     <ol>
       <li>最高分的角色，就是你的旧友人格。它描述的是你在关系里的默认姿势，不是你的全部。</li>
       <li>第二名是你的“副人格”：往往是你羡慕、或者被逼急时会变成的样子。</li>
       <li>分数接近（相差 2 分以内）说明你处在两种模式之间，可以两张解析一起看。</li>
       <li>最低分的那一位，通常是你最不理解、也最容易在关系里撞上的人。</li>
     </ol>
   </div>`,
  "scorepage"
);

/* characters */
characters.forEach((c) => {
  const best = CH[c.best.id];
  const clash = CH[c.clash.id];
  const pair = pairs.find((p) => p.a === c.id || p.b === c.id);
  const partner = pair ? CH[pair.a === c.id ? pair.b : pair.a] : null;
  addSheet(
    "第三部分 · 人格解析",
    `<div class="chead">
      <p class="type-no">第 ${c.no} 型 / 共 8 型 · ${c.pinyin}</p>
      <h2 class="cname">${c.name}</h2>
      <p class="crole">${c.role} · ${c.tag}</p>
      <p class="cquote">“${c.quote}”</p>
      <p class="ckw">${c.keywords.join(" · ")}</p>
    </div>
    <h3>你在关系里的样子</h3>
    <p>${esc(c.portrait)}</p>
    <h3>裂缝是怎么来的</h3>
    <p>${esc(c.crack)}</p>
    <div class="inner">
      <span>一句说不出口的台词</span>
      <p>“${c.inner}”</p>
    </div>
    <h3>和好路线</h3>
    <ol class="route">${c.route.map((r) => `<li>${esc(r)}</li>`).join("")}</ol>
    <div class="twocol">
      <div><h3>和你最合拍</h3><p><b>${best.name}</b>　${esc(c.best.note)}</p></div>
      <div><h3>最容易翻车</h3><p><b>${clash.name}</b>　${esc(c.clash.note)}</p></div>
    </div>
    ${pair ? `<h3>你们这一对</h3><p class="pair">${c.name} × ${partner.name}　「${pair.title}」<br><span>${esc(pair.note)}</span></p>` : ""}
    <p class="scene"><b>节目里的你</b>　${esc(c.scene)}</p>`,
    "charpage",
    false,
    `--c:${c.color};--tint:${c.tint}`
  );
});

/* pairs + closing */
addSheet(
  "第四部分 · 四组关系",
  `<h2 class="sec">四组关系，四种错位</h2>
  <p class="lead">这档节目真正的主角不是八个人，是四种“明明都在乎、却怎么也接不上”的关系结构。测完自己，也不妨对照看看你和那个人的组合。</p>
  <div class="pairlist">
    ${pairs
      .map((p) => {
        const a = CH[p.a];
        const b = CH[p.b];
        return `<div class="pairrow" style="--c:${a.color};--tint:${a.tint}">
          <p class="pairnames">${a.name}<span>×</span>${b.name}</p>
          <p class="pairtitle">「${p.title}」</p>
          <p>${esc(p.note)}</p>
        </div>`;
      })
      .join("")}
  </div>
  <div class="closing">
    <h3>写在最后</h3>
    <p>这道测试没有“好人格”和“坏人格”。张萌的热、马天宇的退、厉娜的直、许飞的理、文吉儿的控、王子璇的醒、青稚的忍、白小纯的冲——都是一个人在关系里活下来的方式。</p>
    <p>真正的分水岭只有一个：你知不知道自己正在用哪一种方式，以及，你愿不愿意为对方换一次。</p>
    <p class="sign">后会友期。愿你和那个走散的人，都还有下一次“后会”。</p>
  </div>`,
  "pairpage"
);

const TOTAL = sheets.length;

const printCss = `
@page { size: A4; margin: 16mm 15mm 13mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  margin: 0; color: #241F19;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 9.6pt; line-height: 1.8;
}
.sheet {
  display: flex; flex-direction: column;
  min-height: 265mm; page-break-after: always; position: relative;
}
.sheet:last-child { page-break-after: auto; }
.runhead {
  display: flex; justify-content: space-between;
  font-size: 7.2pt; letter-spacing: .14em; color: #8D7F6F;
  border-bottom: .5pt solid #DCCEB9; padding-bottom: 2.6mm; margin-bottom: 7mm;
}
.sheetfoot {
  margin-top: auto; padding-top: 2.4mm;
  display: flex; justify-content: flex-end;
  font-size: 7pt; letter-spacing: .14em; color: #9A8D7E;
}
h1, h2, h3, .cover-sub, .cname, .cquote, .inner p, .pairnames { font-family: "Songti SC", "STSong", "Noto Serif SC", serif; font-weight: 600; }

/* cover */
.cover .cover-top { margin-top: 12mm; }
.kicker { font-size: 7.6pt; letter-spacing: .28em; color: #9A8D7E; margin: 0 0 14mm; }
.cover h1 { font-size: 62pt; line-height: 1; margin: 0; letter-spacing: .06em; }
.cover h1 .hit { color: #B4533A; }
.cover-sub { font-size: 17pt; letter-spacing: .5em; color: #4E443A; margin: 7mm 0 0; font-weight: 400; }
.cover-lead { font-family: "Songti SC", serif; font-size: 13pt; line-height: 2; color: #6B5F52; margin: 13mm 0 0; }
.cover-body { margin-top: 12mm; }
.cover-text p { margin: 0 0 4mm; font-size: 9.4pt; line-height: 1.95; color: #4E443A; max-width: 150mm; }
.howto { margin-top: 8mm; border: .6pt solid #E0D3BF; border-radius: 2mm; padding: 5mm 6mm; background: #FBF5E9; }
.howto h3 { font-size: 9pt; letter-spacing: .22em; margin: 0 0 3mm; color: #6B5F52; }
.howto ol { margin: 0; padding-left: 4.5mm; font-size: 8.8pt; line-height: 1.85; color: #4E443A; }
.howto li { margin-bottom: 1.6mm; }
.cover-meta { display: flex; gap: 3mm; margin-top: 8mm; flex-wrap: wrap; }
.cover-meta span { font-size: 7.6pt; letter-spacing: .12em; color: #6B5F52; border: .5pt solid #DCCEB9; border-radius: 99px; padding: 1.2mm 3mm; }
.cover-note { font-size: 7.2pt; line-height: 1.85; color: #9A8D7E; border-top: .5pt solid #E4D8C6; padding-top: 4mm; margin: 9mm 0 0; }

/* questions */
.chapter { font-size: 15pt; letter-spacing: .16em; margin: 0; color: #241F19; }
.chapter-sub { font-size: 8.6pt; color: #9A8D7E; margin: 2mm 0 8mm; }
.q { margin-bottom: 7.6mm; page-break-inside: avoid; }
.qtext { display: flex; gap: 4mm; margin: 0 0 3.4mm; font-size: 9.9pt; line-height: 1.78; }
.qtext b { font-family: "Songti SC", serif; font-size: 10.6pt; color: #B4533A; font-weight: 600; flex: 0 0 8mm; }
.opts { margin-left: 12mm; }
.opt { display: flex; gap: 3mm; margin: 0 0 1.8mm; font-size: 9.3pt; line-height: 1.72; color: #3B332B; }
.opt i { font-style: normal; flex: 0 0 5mm; height: 5mm; line-height: 4.9mm; text-align: center; border: .5pt solid #CFC0A9; border-radius: 50%; font-size: 7pt; color: #8D7F6F; margin-top: .8mm; }
.pick { text-align: right; margin: 2.6mm 0 0; font-size: 7.4pt; letter-spacing: .18em; color: #A2937F; }

/* score */
.sec { font-size: 18pt; margin: 0 0 4mm; letter-spacing: .04em; }
.lead { font-size: 8.8pt; color: #4E443A; margin: 0 0 5mm; max-width: 165mm; }
table.score { width: 100%; border-collapse: collapse; font-size: 7.4pt; }
table.score th, table.score td { border: .5pt solid #DCCEB9; padding: 1.1mm 1.8mm; text-align: left; vertical-align: top; line-height: 1.42; }
table.score thead th { background: #F3EADA; font-weight: 600; letter-spacing: .1em; font-size: 7pt; color: #6B5F52; }
table.score tbody th { width: 11mm; text-align: center; font-weight: 500; color: #8D7F6F; background: #FBF5E9; }
table.score td b { font-weight: 700; color: #241F19; }
.score-how { margin-top: 6mm; }
.score-how h3, .closing h3 { font-size: 8.6pt; letter-spacing: .22em; margin: 0 0 2.4mm; color: #6B5F52; }
.score-how ol { margin: 0; padding-left: 4.5mm; font-size: 8.2pt; line-height: 1.8; color: #4E443A; }
.score-how li { margin-bottom: 1mm; }

/* character */
.chead { border-bottom: 1pt solid var(--c); padding-bottom: 4.5mm; margin-bottom: 5mm; }
.type-no { font-size: 7.2pt; letter-spacing: .26em; color: var(--c); margin: 0; }
.cname { font-size: 31pt; margin: 2mm 0 1mm; color: var(--c); letter-spacing: .06em; }
.crole { margin: 0; font-size: 8.6pt; letter-spacing: .16em; color: #6B5F52; }
.cquote { font-size: 12pt; line-height: 1.8; color: #241F19; margin: 4.6mm 0 2mm; padding-left: 4mm; border-left: 1.6pt solid var(--c); }
.ckw { font-size: 7.6pt; letter-spacing: .18em; color: var(--c); margin: 0; }
.charpage h3 { font-size: 8.2pt; letter-spacing: .2em; color: #8D7F6F; margin: 4.6mm 0 1.8mm; font-weight: 500; font-family: "PingFang SC", sans-serif; }
.charpage p { margin: 0; font-size: 9.4pt; line-height: 1.95; color: #3B332B; }
.inner { background: var(--tint); border-radius: 2mm; padding: 4mm 5mm; margin: 4.5mm 0 1.5mm; }
.inner span { font-size: 7pt; letter-spacing: .2em; color: var(--c); }
.inner p { font-size: 11.5pt; line-height: 1.8; margin-top: 1mm; color: #241F19; }
ol.route { margin: 0; padding-left: 4.5mm; font-size: 9pt; line-height: 1.8; color: #3B332B; }
ol.route li { margin-bottom: 1mm; }
.twocol { display: flex; gap: 6mm; }
.twocol > div { flex: 1; }
.twocol p b { color: var(--c); }
.pair { font-size: 9pt; line-height: 1.8; }
.pair span { color: #6B5F52; font-size: 8.6pt; }
.scene { margin-top: 4mm !important; padding-top: 3mm; border-top: .5pt solid #E4D8C6; font-size: 8.5pt !important; color: #6B5F52 !important; line-height: 1.8; }
.scene b { letter-spacing: .16em; font-size: 7.2pt; color: #8D7F6F; font-weight: 500; }

/* pairs */
.pairlist { display: grid; gap: 4.2mm; }
.pairrow { border: .6pt solid #E0D3BF; border-left: 2.4pt solid var(--c); border-radius: 1.6mm; padding: 4mm 5mm; background: #FDF9F0; }
.pairnames { font-size: 14pt; margin: 0; letter-spacing: .04em; }
.pairnames span { font-size: 8pt; color: #9A8D7E; margin: 0 3mm; font-family: "PingFang SC", sans-serif; }
.pairtitle { font-size: 9pt; color: var(--c); letter-spacing: .12em; margin: 1mm 0 1.6mm; }
.pairrow > p:last-child { font-size: 8.7pt; line-height: 1.8; color: #4E443A; margin: 0; }
.closing { margin-top: 8mm; border-top: .8pt solid #DCCEB9; padding-top: 6mm; }
.closing p { font-size: 9.2pt; line-height: 1.95; color: #3B332B; margin: 0 0 3mm; }
.closing .sign { font-family: "Songti SC", serif; font-size: 10.5pt; color: #6B5F52; margin-top: 6mm; }
`;

const printHtml = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>后会友期 · 旧友人格测试（印刷版）</title>
<style>${printCss}</style>
</head>
<body>
${sheets
  .map(
    (s, i) => `<div class="sheet ${s.cls}"${s.style ? ` style="${s.style}"` : ""}>
${s.noHead ? "" : `<div class="runhead"><span>后会友期 · 旧友人格测试</span><span>${s.label}</span></div>`}
${s.body}
${s.noFoot ? "" : `<div class="sheetfoot"><span>${PAD(i + 1)} / ${PAD(TOTAL)}</span></div>`}
</div>`
  )
  .join("\n")}
</body>
</html>`;

fs.writeFileSync(path.join(root, "print.html"), printHtml);

console.log("built index.html and print.html");
console.log("print pages:", TOTAL);
console.log("chars:", characters.map((c) => `${c.no}.${c.name}`).join(" "));
console.log("questions:", questions.length, "| max score:", MAX);
