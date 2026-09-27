#!/usr/bin/env node
/**
 * frontend-master interface audit (the P4 machine gate).
 *
 * Static, conservative checks only. Every rule must be mechanically decidable:
 * a false positive costs more than a missing rule, because the audit's
 * credibility is what makes it useful. Rules that need judgement (composition,
 * hierarchy, brand fit) belong to references/08-critique.md, not here.
 *
 * Rules are dispatched by file kind, so an implementation file (.js/.mjs/.ts)
 * never trips markup rules just because a rule pattern appears in its source:
 *   markup (.html/.htm/.vue/.svelte/.astro/.jsx/.tsx) -> accessibility, content, style
 *   style  (.css/.scss/.sass/.less)                  -> accessibility (focus), style
 *   script (.js/.mjs/.ts)                            -> dependency verification only
 *
 * Usage:
 *   node scripts/audit.mjs <file-or-dir> [...more]
 *   node scripts/audit.mjs src --json
 *
 * Exit code: 1 when any CRITICAL finding exists, otherwise 0.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

const CODE_EXT = new Set([
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.astro', '.mjs',
]);

const SKIP_DIR = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.svelte-kit',
  'coverage', 'out', 'vendor', '.cache', '.turbo', '__snapshots__',
  // deliberately-bad fixtures; audit them by passing the file path explicitly
  'selftest',
]);

const MARKUP_EXT = new Set(['.html', '.htm', '.vue', '.svelte', '.astro', '.jsx', '.tsx']);
const STYLE_EXT = new Set(['.css', '.scss', '.sass', '.less']);
const MAX_PER_RULE_PER_FILE = 8;

// ------------------------------------------------------------------ input

function collectFiles(target) {
  const abs = resolve(target);
  if (!existsSync(abs)) return { files: [], missing: abs };
  const st = statSync(abs);
  if (st.isFile()) return { files: [abs], missing: null };

  const files = [];
  const walk = (dir, depth) => {
    if (depth > 14) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (e.name.startsWith('.') || SKIP_DIR.has(e.name)) continue;
        walk(join(dir, e.name), depth + 1);
      } else if (CODE_EXT.has(extname(e.name).toLowerCase())) {
        files.push(join(dir, e.name));
      }
    }
  };
  walk(abs, 0);
  return { files, missing: null };
}

// ----------------------------------------------------------------- output

const findings = [];
function add(level, file, line, rule, message) {
  findings.push({ level, file, line, rule, message });
}

const rel = (p) => relative(process.cwd(), p) || p;

// ------------------------------------------------------------------ rules

/** Shared cross-file buckets for whole-scope (not per-line) judgements. */
const scope = {
  radius: new Map(),
  shadow: new Map(),
  uppercaseEyebrow: 0,
  hoverShift: 0,
  filesWithMotion: new Set(),
  filesWithReducedMotion: new Set(),
};

function bump(map, key) {
  const k = key.trim().replace(/\s+/g, ' ');
  map.set(k, (map.get(k) || 0) + 1);
}

function auditAccessibility(file, lines, full, counts) {
  const ext = extname(file).toLowerCase();
  const markup = MARKUP_EXT.has(ext);
  const style = STYLE_EXT.has(ext);
  if (!markup && !style) return;

  // label association index (file-level, because `for` may precede the control)
  const labeled = new Set();
  for (const m of full.matchAll(/<label[^>]*\b(?:for|htmlFor)\s*=\s*["'{]([^"'}\s]+)["'}]/g)) {
    labeled.add(m[1]);
  }

  lines.forEach((raw, i) => {
    const line = i + 1;

    // img without alt (+ intrinsic size, which also feeds the CLS rule)
    for (const m of markup ? raw.matchAll(/<img\b[^>]*>/gi) : []) {
      if (!/\balt\s*=/i.test(m[0])) {
        counts.rule('a11y/img-alt', () => add('CRITICAL', file, line, 'a11y/img-alt', '<img> 缺少 alt 属性（装饰图用 alt=""）'));
      }
      if (!/\bwidth\s*=/i.test(m[0]) && !/\bheight\s*=/i.test(m[0]) && !/aspect-ratio/i.test(m[0])) {
        counts.rule('perf/img-size', () => add('WARN', file, line, 'perf/img-size', '<img> 未声明 width/height 或 aspect-ratio —— 会贡献 CLS'));
      }
    }

    // form controls without an accessible name
    for (const m of markup ? raw.matchAll(/<(input|select|textarea)\b([^>]*)>/gi) : []) {
      const tag = m[1].toLowerCase();
      const attrs = m[2] || '';
      const type = (attrs.match(/\btype\s*=\s*["'{]?([a-z]+)/i) || [, 'text'])[1].toLowerCase();
      if (tag === 'input' && ['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) continue;
      if (/\b(aria-label|aria-labelledby|title)\s*=/i.test(attrs)) continue;
      const id = (attrs.match(/\bid\s*=\s*["'{]([^"'}\s]+)["'}]/) || [])[1];
      if (id && labeled.has(id)) continue;
      // wrapped in a <label> (heuristic: an unclosed <label> shortly before)
      const before = raw.slice(0, m.index ?? 0);
      const lastOpen = before.lastIndexOf('<label');
      const lastClose = before.lastIndexOf('</label>');
      if (lastOpen > lastClose) continue;
      counts.rule('a11y/control-label', () => add('CRITICAL', file, line, 'a11y/control-label', `<${tag}> 没有可访问名称（需要 <label for>、包裹式 label 或 aria-label）`));
    }

    // outline removal
    if (/outline\s*:\s*(none|0)\b/i.test(raw)) {
      counts.rule('a11y/focus-outline', () => add('CRITICAL', file, line, 'a11y/focus-outline', '移除了 outline —— 必须用 :focus-visible 提供等价可见焦点'));
    }

    // zoom disabled
    if (markup && (/user-scalable\s*=\s*["']?no/i.test(raw) || /maximum-scale\s*=\s*["']?1(\.0)?["'\s>]/i.test(raw))) {
      counts.rule('a11y/zoom-lock', () => add('CRITICAL', file, line, 'a11y/zoom-lock', 'viewport 禁止缩放（user-scalable=no / maximum-scale=1）'));
    }

    // clickable non-interactive element
    for (const m of markup ? raw.matchAll(/<(div|span)\b([^>]*)>/gi) : []) {
      const attrs = m[2] || '';
      if (/\bonclick\s*=|@click\s*=|on:click\s*=/i.test(attrs) && !/\brole\s*=|\btabindex\s*=/i.test(attrs)) {
        counts.rule('a11y/click-target', () => add('WARN', file, line, 'a11y/click-target', `<${m[1].toLowerCase()}> 绑定了点击但没有 role/tabindex —— 键盘不可达`));
      }
    }

    // empty link
    for (const m of markup ? raw.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/gi) : []) {
      const attrs = m[1] || '';
      const text = (m[2] || '').trim();
      if (!text && !/\b(aria-label|title)\s*=/i.test(attrs)) {
        counts.rule('a11y/link-name', () => add('CRITICAL', file, line, 'a11y/link-name', '<a> 没有可见文本也没有 aria-label —— 屏幕阅读器读不出'));
      }
    }

    // emoji as icon (markup content only)
    if (markup) {
      for (const m of raw.matchAll(/>([^<>]{1,120})</g)) {
        if (/\p{Extended_Pictographic}/u.test(m[1])) {
          counts.rule('a11y/emoji-icon', () => add('WARN', file, line, 'a11y/emoji-icon', '标签文本里出现 emoji —— 图标应来自统一图标集'));
          break;
        }
      }
    }

    // structural
    if (markup && /<html\b/i.test(raw) && !/\blang\s*=/i.test(raw)) {
      counts.rule('a11y/html-lang', () => add('WARN', file, line, 'a11y/html-lang', '<html> 缺少 lang 属性'));
    }
    if (markup && /<head\b/i.test(raw) && !/<meta\b[^>]*viewport/i.test(full)) {
      counts.rule('a11y/viewport-meta', () => add('WARN', file, line, 'a11y/viewport-meta', '缺少 viewport meta —— 移动端会按桌面宽度渲染'));
    }
  });
}

function auditContent(file, lines, counts) {
  if (!MARKUP_EXT.has(extname(file).toLowerCase())) return;
  const patterns = [
    [/lorem\s+ipsum/i, 'CRITICAL', 'content/lorem', 'Lorem ipsum —— 必须换成真实或可信的拟真内容'],
    [/\b(jane|john)\s+doe\b/i, 'CRITICAL', 'content/placeholder-name', '占位人名 —— 必须换成可信内容'],
    [/\bexample\.com\b/i, 'CRITICAL', 'content/example-domain', 'example.com 占位域名 —— 必须换成真实地址'],
    [/\bacme\s+(corp|inc|co|ltd)\b/i, 'WARN', 'content/acme', 'Acme 占位品牌 —— 换成具体主体'],
    [/\bfoo\s*(bar|baz)?\b/i, 'WARN', 'content/foobar', 'foo/bar 占位符'],
  ];
  lines.forEach((raw, i) => {
    for (const [re, level, rule, msg] of patterns) {
      if (re.test(raw)) counts.rule(rule, () => add(level, file, i + 1, rule, msg));
    }
  });
}

function auditAiTells(file, lines, full, counts) {
  const ext = extname(file).toLowerCase();
  if (!MARKUP_EXT.has(ext) && !STYLE_EXT.has(ext)) return;

  lines.forEach((raw, i) => {
    const line = i + 1;

    for (const m of raw.matchAll(/border-radius\s*:\s*([^;{}]+)/gi)) bump(scope.radius, m[1]);
    for (const m of raw.matchAll(/borderRadius\s*[:=]\s*["'`]([^"'`]+)["'`]/g)) bump(scope.radius, m[1]);

    for (const m of raw.matchAll(/box-shadow\s*:\s*([^;{}]+)/gi)) bump(scope.shadow, m[1]);
    for (const m of raw.matchAll(/boxShadow\s*[:=]\s*["'`]([^"'`]+)["'`]/g)) bump(scope.shadow, m[1]);

    // gradient carrying no meaning + the current default AI palette
    if (/linear-gradient|radial-gradient/i.test(raw)) {
      if (/#6366f1|#8b5cf6|#a855f7|#7c3aed|indigo|violet|purple/i.test(raw)) {
        counts.rule('aitell/violet-gradient', () => add('WARN', file, line, 'aitell/violet-gradient', '紫/靛蓝渐变 —— 当前最典型的生成痕迹配色'));
      }
    }

    // near-black + high-saturation accent
    if (/#0[0-9a-f]0[0-9a-f]0[0-9a-f]\b/i.test(raw) && /#00ff00|#0f0\b|#22c55e|#16a34a|#ff2d00|#ff0044/i.test(raw)) {
      counts.rule('aitell/black-acid', () => add('WARN', file, line, 'aitell/black-acid', '近黑底 + 高饱和强调色 —— 已成簇出现的默认配方'));
    }

    // transition: all
    if (/transition\s*:\s*all\b/i.test(raw)) {
      counts.rule('perf/transition-all', () => add('WARN', file, line, 'perf/transition-all', 'transition: all 会监听全部属性 —— 明确列出要动的属性'));
    }

    // animating layout-affecting properties
    if (/transition\s*:[^;{}]*\b(width|height|top|left|right|bottom|margin|padding)\b/i.test(raw)) {
      counts.rule('perf/layout-animation', () => add('WARN', file, line, 'perf/layout-animation', '对布局属性做过渡会触发重排 —— 只动 transform / opacity'));
    }

    if (/text-transform\s*:\s*uppercase/i.test(raw)) scope.uppercaseEyebrow += 1;
    if (/:hover[^{}]*\{[^{}]*transform\s*:[^{}]*translate[XY]/i.test(raw)) scope.hoverShift += 1;

    if (/@font-face/.test(raw)) {
      const block = full.slice(full.indexOf('@font-face'), full.indexOf('@font-face') + 600);
      if (block && !/font-display\s*:/.test(block)) {
        counts.rule('perf/font-display', () => add('WARN', file, line, 'perf/font-display', '@font-face 缺少 font-display —— 文字会长时间不可见'));
      }
    }
  });

  // motion without a reduced-motion escape
  if (/transition\s*:|animation\s*:|animate-|@keyframes|framer-motion|motion\./i.test(full)) {
    scope.filesWithMotion.add(file);
    if (/prefers-reduced-motion/i.test(full)) scope.filesWithReducedMotion.add(file);
  }

  // hardcoded hex outside a token layer
  if (['.tsx', '.jsx', '.vue', '.svelte', '.astro'].includes(ext) && !/var\(--/.test(full)) {
    const hexes = full.match(/[:\s=]["'`]?#[0-9a-fA-F]{6}\b/g) || [];
    if (hexes.length >= 8) {
      counts.rule('aitell/hardcoded-hex', () => add('WARN', file, 1, 'aitell/hardcoded-hex', `组件内硬编码 ${hexes.length} 处 hex 色值且无 var(--*) —— 颜色应走 token 层`));
    }
  }
}

function auditDependencies(file, full, packageJson, counts) {
  if (!packageJson) return;
  if (!['.js', '.jsx', '.ts', '.tsx', '.mjs', '.vue', '.svelte', '.astro'].includes(extname(file).toLowerCase())) return;

  const deps = new Set([
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
  ]);

  const specs = new Set();
  for (const re of [
    /(?:^|\n)\s*import\s+[^;\n]*?from\s+["']([^"']+)["']/g,
    /(?:^|\n)\s*import\s+["']([^"']+)["']/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
  ]) {
    for (const m of full.matchAll(re)) specs.add(m[1]);
  }

  for (const spec of specs) {
    if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:') || spec.startsWith('@/')) continue;
    const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    if (!deps.has(name)) {
      counts.rule('eng/unverified-dep', () => add('CRITICAL', file, 1, 'eng/unverified-dep', `导入了未声明的依赖 "${name}" —— 依赖必须可验证存在`));
    }
  }
}

// ------------------------------------------------------------------- run

function main() {
  const args = process.argv.slice(2);
  const jsonOut = args.includes('--json');
  const targets = args.filter((a) => !a.startsWith('--'));

  if (!targets.length) {
    process.stderr.write(
      '用法: node scripts/audit.mjs <文件或目录> [...] [--json]\n' +
      '退出码: 存在 CRITICAL 时为 1。\n',
    );
    process.exit(2);
  }

  let files = [];
  for (const t of targets) {
    const { files: f, missing } = collectFiles(t);
    if (missing) process.stderr.write(`跳过（不存在）: ${rel(missing)}\n`);
    files.push(...f);
  }
  files = [...new Set(files)];

  if (!files.length) {
    process.stderr.write('没有可审计的源文件。\n');
    process.exit(0);
  }

  // one package.json lookup per directory, cached
  const pkgCache = new Map();
  const lookupPkg = (file) => {
    let dir = dirname(file);
    for (let i = 0; i < 8; i += 1) {
      if (pkgCache.has(dir)) return pkgCache.get(dir);
      const p = join(dir, 'package.json');
      if (existsSync(p)) {
        try {
          const parsed = JSON.parse(readFileSync(p, 'utf8'));
          pkgCache.set(dir, parsed);
          return parsed;
        } catch {
          pkgCache.set(dir, null);
          return null;
        }
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    pkgCache.set(dirname(file), null);
    return null;
  };

  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split(/\r?\n/);
    const counts = {
      perRule: new Map(),
      rule(key, fn) {
        const n = this.perRule.get(key) || 0;
        if (n >= MAX_PER_RULE_PER_FILE) return;
        this.perRule.set(key, n + 1);
        fn();
      },
    };

    auditContent(file, lines, counts);
    auditAccessibility(file, lines, text, counts);
    auditAiTells(file, lines, text, counts);
    auditDependencies(file, text, lookupPkg(file), counts);
  }

  // ---- whole-scope judgements

  const distinctRadius = [...scope.radius.keys()];
  const radiusTotal = [...scope.radius.values()].reduce((a, b) => a + b, 0);
  if (radiusTotal >= 3 && distinctRadius.length === 1) {
    add('WARN', '(scope)', 0, 'aitell/uniform-radius',
      `全范围内只用了 1 种圆角（${distinctRadius[0]}，共 ${radiusTotal} 处）—— 层级信息被抹平，是模板特征`);
  }

  for (const [value, n] of scope.shadow) {
    if (n >= 3 && /rgba?\(\s*0\s*,\s*0\s*,\s*0/i.test(value)) {
      add('WARN', '(scope)', 0, 'aitell/uniform-shadow',
        `同一个柔和阴影重复 ${n} 次（${value}）—— 阴影成了装饰而非光照逻辑`);
    }
  }

  if (scope.uppercaseEyebrow >= 3) {
    add('WARN', '(scope)', 0, 'aitell/eyebrow',
      `${scope.uppercaseEyebrow} 处 text-transform: uppercase —— 检查是否是"每个标题上一个 eyebrow 小标签"的形式外壳`);
  }
  if (scope.hoverShift >= 4) {
    add('WARN', '(scope)', 0, 'aitell/hover-shift',
      `${scope.hoverShift} 处 hover 位移 —— 无差别动效等于没有动效设计`);
  }

  const motionNoEscape = [...scope.filesWithMotion].filter((f) => !scope.filesWithReducedMotion.has(f));
  if (motionNoEscape.length) {
    add('WARN', motionNoEscape[0], 0, 'a11y/reduced-motion',
      `${motionNoEscape.length} 个含动效的文件没有 prefers-reduced-motion 降级（例如 ${rel(motionNoEscape[0])}）`);
  }

  // ---- report

  const order = { CRITICAL: 0, WARN: 1 };
  findings.sort((a, b) => (order[a.level] - order[b.level]) || a.file.localeCompare(b.file) || a.line - b.line);

  if (jsonOut) {
    const crit = findings.filter((f) => f.level === 'CRITICAL').length;
    process.stdout.write(`${JSON.stringify({
      scannedFiles: files.length,
      critical: crit,
      warn: findings.length - crit,
      findings: findings.map((f) => ({ ...f, file: rel(f.file) })),
    }, null, 2)}\n`);
    process.exit(crit > 0 ? 1 : 0);
  }

  const critical = findings.filter((f) => f.level === 'CRITICAL');
  const warn = findings.filter((f) => f.level === 'WARN');

  const width = Math.max(...findings.map((f) => rel(f.file).length + String(f.line).length), 20);

  for (const f of findings) {
    const loc = `${rel(f.file)}:${f.line}`;
    process.stdout.write(`${f.level.padEnd(8)} ${loc.padEnd(width + 2)} ${f.message}  [${f.rule}]\n`);
  }

  process.stdout.write(`\n扫描 ${files.length} 个文件 · CRITICAL ${critical.length} · WARN ${warn.length}\n`);
  if (critical.length) {
    process.stdout.write('存在 CRITICAL：修完才能交付。\n');
  } else if (warn.length) {
    process.stdout.write('无 CRITICAL。WARN 要么修掉，要么在交付说明里给出保留理由。\n');
  } else {
    process.stdout.write('机器审计通过。\n');
  }

  process.exit(critical.length ? 1 : 0);
}

main();
