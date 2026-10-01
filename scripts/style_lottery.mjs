#!/usr/bin/env node
/**
 * frontend-master style lottery — the anti-default mechanism.
 *
 * Left to itself an agent keeps building its loudest page: violet gradient,
 * glassmorphism, a centered hero over three cards. That is ONE direction out
 * of twelve, not the house style. A quiet direction done cleanly beats the
 * loud one built a fourth time, so the default is a draw, not a repeat.
 *
 * This script only decides and records. The recipes live in
 * references/02-aesthetic-directions.md — the deck below mirrors it, so a
 * change to a direction there must be mirrored here.
 *
 * Usage:
 *   node scripts/style_lottery.mjs                    # draw one
 *   node scripts/style_lottery.mjs --seed 7           # reproducible draw
 *   node scripts/style_lottery.mjs --list             # the whole deck
 *   node scripts/style_lottery.mjs --avoid swiss,brutalist
 *   node scripts/style_lottery.mjs --write ./my-site  # leave STYLE.md there
 *   node scripts/style_lottery.mjs --json
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * loud: 1 (quietest) .. 10 (loudest). The deck is deliberately half quiet —
 * six cards sit at 4 or below. Drawing a quiet card is not a downgrade.
 */
const DECK = [
  {
    id: 'editorial-broadsheet',
    name: 'Editorial Broadsheet · 编辑排版',
    section: 1,
    idiom: '把内容当成报纸编排。信息层级靠分栏、规则线与字号跨度承载。',
    palette: '冷白纸 #FBFAF8（不要暖奶油）· 墨黑 #14120E · 规则线 #D8D5CE · 印刷红 #B3261E',
    type: 'Fraunces（可变 optical size）+ Source Serif 4 或 Newsreader + IBM Plex Mono',
    loud: 3,
    note: '规则线的位置必须与栏边界对齐——错开 2px 整页就松散。字号跨度不足 3 级会退化成博客：标题 / 副标 / 正文 / 注脚至少要拉开 4 档。',
    dials: 'V5 M2 D5',
  },
  {
    id: 'swiss',
    name: 'Swiss · 国际主义',
    section: 2,
    idiom: '网格即秩序。用字号跨度与对齐产生张力，不靠装饰。',
    palette: '纯白 #FFFFFF · 真黑 #111111（不用"高级黑"）· 网格线 #E5E5E5 · 瑞士红 #E4002B',
    type: 'Inter Tight 或 Archivo，大字号配负字距 -0.02em，数字用 tabular-nums',
    loud: 2,
    note: '最容易犯的是"假装对齐"——元素看起来在栏上，实际靠目测留白摆的。必须用真实 12 列网格，且每一处左右边界都真的落在栏线上；这张牌的成败全在对齐，特效救不回来。',
    dials: 'V4 M2 D5',
  },
  {
    id: 'brutalist',
    name: 'Brutalist · 粗野',
    section: 3,
    idiom: '暴露结构与默认样式，拒绝修饰。',
    palette: '纯白或警示黄 #FFE600 · 纯黑 #000000 · 热红 #FF2D00 · 未访问蓝 #0000EE',
    type: '系统 Times New Roman / Arial / Courier New，或 Archivo Black + Space Mono',
    loud: 8,
    note: '失败形态是"温和粗野"——加了圆角、软阴影、礼貌留白，两头不靠。硬阴影必须零模糊（blur 与 spread 都取 0），黑描边至少 3px，圆角一律 0。',
    dials: 'V9 M3 D6',
  },
  {
    id: 'technical-terminal',
    name: 'Technical Terminal · 工程技术感',
    section: 4,
    idiom: '界面像一台正在运行的仪器。',
    palette: '近黑蓝 #0A0E12 · 前景 #C8D3DC · 分隔线 #1C242C · 低饱和绿 #7CE38B（不要酸绿）· 警告 #E3B341',
    type: 'IBM Plex Mono 或 JetBrains Mono（标签与数据）+ IBM Plex Sans（正文）',
    loud: 5,
    note: '两个坑：拿等宽体做长正文（行宽失控、阅读疲劳），以及把"黑底绿字"当成这张牌的全部表达。等宽只给标签、数据、代码；正文交给无衬线。',
    dials: 'V3 M4 D8',
  },
  {
    id: 'luxury-serif',
    name: 'Luxury Serif · 高定',
    section: 5,
    idiom: '用留白与极小的字表达贵。',
    palette: '近黑 #0E0D0B · 米白 #EDE7DD · 金 #C8A96A · 深墨绿 #1A2E29 或酒红 #5B1F2A',
    type: 'Cormorant Garamond / Bodoni Moda / Italiana + Jost 或窄体无衬线，正文字号偏小',
    loud: 2,
    note: '失败的样子是"字号小但挤在一起"，看起来像被缩小了的普通页面。留白不够就取消这个方向：行高至少 1.7，版心收窄到单列，且绝不用加大字重来"补气"。',
    dials: 'V4 M3 D2',
  },
  {
    id: 'warm-organic',
    name: 'Warm Organic · 温暖有机',
    section: 6,
    idiom: '材料感与手作痕迹，但不"可爱"。',
    palette: '奶油 #FAF6EF · 陶土 #C9714F · 苔绿 #5A6B4A · 沙 #E8DCC8 · 墨 #2B2622',
    type: 'Fraunces（soft 轴）+ Karla 或 Work Sans',
    loud: 4,
    note: '只取奶油 + 陶土两个色就是 AI 配方本体，换了名字而已。必须同时出现苔绿或沙色，并且真有材质（纸纹、编织、有方向的光）——"温暖"来自材质，不来自色相。',
    dials: 'V5 M4 D4',
  },
  {
    id: 'retro-futurist',
    name: 'Retro-Futurist · 复古未来',
    section: 7,
    idiom: '70–80 年代对未来的想象。',
    palette: '深空紫 #0B0A1F · 青 #4DE0E0 · 品红 #FF4FA3 · 琥珀 #FFB347 · 前景 #E8E8F5',
    type: 'Michroma / Chakra Petch / Unbounded + IBM Plex Sans',
    loud: 9,
    note: '失败形态是"每个元素都在发光"。辉光只给不超过 2 个焦点元素，正文永不加 text-shadow；扫描线透明度压在 0.06 以内，高了立刻变成廉价 CRT 滤镜。',
    dials: 'V7 M7 D5',
  },
  {
    id: 'maximalist-collage',
    name: 'Maximalist Collage · 极繁拼贴',
    section: 8,
    idiom: '信息过载作为故意的手法。',
    palette: '红 #FF3B30 · 蓝 #0047FF · 黄 #FFD400 · 纸白 #F7F5F0 · 墨 #0A0A0A',
    type: 'Bricolage Grotesque / Archivo Black / Syne + 一个衬线做冲突',
    loud: 10,
    note: '混乱必须止步于装饰层——正文仍要守住清晰版心与 4.5:1 对比度。参与旋转、叠压的元素不超过 3 层，超过之后读不出层次，只剩脏。',
    dials: 'V10 M8 D7',
  },
  {
    id: 'quiet-minimalism',
    name: 'Quiet Minimalism · 静默极简',
    section: 9,
    idiom: '最容易被误认成默认 AI 输出的方向，因此必须靠细节取胜。',
    palette: '非纯白 #FCFCFC · 墨 #1A1A1A · 次级 #8A8A8A · 线 #EBEBEB · 唯一暖点 #E9E4DB',
    type: 'Instrument Sans 或 Geist · 点缀 Instrument Serif（只用一两处）',
    loud: 1,
    note: '这个方向没有装饰可以遮挡，成败全在间距与对齐精度：垂直节奏落在统一刻度（4/8pt），字号跨度虽小但每一档都要精确。一旦出现三卡片、eyebrow 标签或渐变，就与默认输出无法区分。',
    dials: 'V3 M2 D3',
  },
  {
    id: 'data-dense-dashboard',
    name: 'Data-Dense Dashboard · 数据密集',
    section: 10,
    idiom: '信息就是界面。',
    palette: '底 #12161B · 面板 #1A2027 · 线 #2A323C · 前景 #E6EDF3 · 正 #3FB950 · 负 #F85149 · 强调 #58A6FF',
    type: 'IBM Plex Sans + IBM Plex Mono，数字必须 tabular-nums',
    loud: 4,
    note: '别用阴影表达层级——密集界面一加阴影立刻变脏。层级只能靠面板背景明度差与 1px 线。状态色不许单独承载语义，必须配图标或文字（红绿盲）。',
    dials: 'V2 M2 D9',
  },
  {
    id: 'playful-toy',
    name: 'Playful Toy · 玩趣',
    section: 11,
    idiom: '明确面向儿童的形态与反馈。',
    palette: '天蓝 #7EC8E3 · 太阳黄 #FFC93C · 珊瑚 #FF6B6B · 叶绿 #6BCB77 · 墨 #22303B',
    type: 'Gabarito / Fredoka / Baloo 2',
    loud: 7,
    note: '最大的坑是"为了可爱牺牲对比度"——白字压在中饱和黄或天蓝上根本读不出来。可爱来自形态、圆角与反馈动效，对比度不参与让步，正文仍要 4.5:1。',
    dials: 'V7 M7 D3',
  },
  {
    id: 'neo-memphis',
    name: 'Neo-Memphis · 后孟菲斯',
    section: 12,
    idiom: '几何图形、撞色与错位的秩序。',
    palette: '底 #F2EFE9 · 粉 #FF6FB5 · 青 #00C9B8 · 紫 #6C5CE7 · 墨 #16161A',
    type: 'Syne / Unbounded（display）+ Archivo（正文）',
    loud: 8,
    note: '失败形态是"随机撒图形"——每个图形都要落在网格交点或有意留白处，且位置能被解释。数量压到 3–5 个，再多就从构图变成剪贴画库存。',
    dials: 'V8 M6 D4',
  },
];

// ------------------------------------------------------------------ helpers

const LOUD_LABEL = (n) => (n <= 3 ? '安静档' : n <= 6 ? '中档' : '响档');
const quietCount = DECK.filter((c) => c.loud <= 4).length;

/** Deterministic 32-bit PRNG (mulberry32) so --seed reproduces a draw. */
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cardMarkdown(card, seedNote) {
  return [
    `# STYLE — ${card.name}  (\`${card.id}\`)`,
    '',
    `> ${card.idiom}`,
    '',
    '| | |',
    '|---|---|',
    `| 色板 | ${card.palette} |`,
    `| 字体 | ${card.type} |`,
    `| 响度 | ${card.loud} / 10（${LOUD_LABEL(card.loud)}） |`,
    `| DIALS | ${card.dials} |`,
    '',
    '## 最容易做坏',
    '',
    card.note,
    '',
    '## 下一步',
    '',
    `完整 token 配方见 \`references/02-aesthetic-directions.md\` 第 ${card.section} 节。`,
    '',
    '**抽到哪张做哪张。** 牌堆里 12 张有 ' + quietCount + ' 张在响度 4 以下——',
    '安静的方向做干净了同样成立，不要因为"这张不够炫"换牌。',
    '排掉抽签的只有两种情况：用户点名了风格或参考片，或者在改一个已有的页面。',
    seedNote,
    '',
  ].join('\n');
}

// ------------------------------------------------------------------- main

function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i === -1 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true);
  };

  if (flag('--list')) {
    process.stdout.write(`牌堆：${DECK.length} 张（响度 ≤4 的安静牌 ${quietCount} 张）\n\n`);
    process.stdout.write('响度  牌面                             定位\n');
    process.stdout.write('────────────────────────────────────────────────────────────────\n');
    for (const c of [...DECK].sort((a, b) => a.loud - b.loud)) {
      process.stdout.write(
        `${String(c.loud).padStart(3)}   ${c.id.padEnd(22)} ${c.name.split(' · ')[1] || c.name}\n`,
      );
    }
    process.stdout.write('\n用 --seed N 复现同一次抽签，--avoid a,b 跳过指定牌。\n');
    return;
  }

  const avoidRaw = flag('--avoid');
  const avoid = new Set(
    typeof avoidRaw === 'string' ? avoidRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
  );

  const unknown = [...avoid].filter((id) => !DECK.some((c) => c.id === id));
  if (unknown.length) {
    process.stderr.write(`未知牌 id：${unknown.join(', ')}（用 --list 看整副牌）\n`);
    process.exit(2);
  }

  const seedRaw = flag('--seed');
  const seed =
    typeof seedRaw === 'string' && /^\d+$/.test(seedRaw)
      ? Number(seedRaw)
      : Math.floor(Math.random() * 2 ** 31);

  const pool = DECK.filter((c) => !avoid.has(c.id));
  if (!pool.length) {
    process.stderr.write('--avoid 把整副牌都排掉了。\n');
    process.exit(2);
  }

  const rng = makeRng(seed);
  const card = pool[Math.floor(rng() * pool.length)];

  if (flag('--json')) {
    process.stdout.write(`${JSON.stringify({ ...card, seed, poolSize: pool.length }, null, 2)}\n`);
    return;
  }

  const seedNote = `\n> 抽签 seed：\`${seed}\`（复现这次抽签：\`--seed ${seed}\`）\n`;
  const md = cardMarkdown(card, seedNote);
  process.stdout.write(md);

  const dest = flag('--write');
  if (typeof dest === 'string') {
    const dir = resolve(dest);
    const path = resolve(dir, 'STYLE.md');
    if (existsSync(path) && !flag('--force')) {
      process.stderr.write(`\n${path} 已存在——加 --force 覆盖，或换个目录。\n`);
      process.exit(2);
    }
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, md, 'utf8');
    process.stderr.write(`\n已写入 ${path}\n`);
  }
}

main();
