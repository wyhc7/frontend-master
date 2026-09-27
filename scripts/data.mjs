#!/usr/bin/env node
/**
 * frontend-master data layer bridge.
 *
 * Thin wrapper that locates the BM25 design-intelligence engine
 * (ui-ux-pro-max: search.py + data/*.csv) and forwards all arguments to it.
 * No reimplementation -- the upstream engine stays the single source of truth.
 *
 * Usage (arguments are passed straight through):
 *   node scripts/data.mjs "<query>" --domain <domain> --max-results 3
 *   node scripts/data.mjs "<query>" --stack <stack> --max-results 3
 *   node scripts/data.mjs "<query>" --design-system --variance 7 --motion 6 --density 5 -p "Name"
 *   node scripts/data.mjs check
 *
 * Environment overrides:
 *   FRONTEND_MASTER_DATA_DIR  path to the ui-ux-pro-max skill root
 *   FRONTEND_MASTER_PYTHON    python executable to use
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(HERE, '..');

const ENGINE_ROOTS = [
  process.env.FRONTEND_MASTER_DATA_DIR,
  join(SKILL_ROOT, 'vendor', 'ui-ux-pro-max'),
  join(homedir(), '.claude', 'skills', 'ui-ux-pro-max'),
  join(homedir(), '.dsh', 'skills', 'ui-ux-pro-max'),
  join(homedir(), '.config', 'claude', 'skills', 'ui-ux-pro-max'),
]
  .filter(Boolean)
  .map((p) => resolve(p));

const PYTHON_CANDIDATES = process.env.FRONTEND_MASTER_PYTHON
  ? [{ cmd: process.env.FRONTEND_MASTER_PYTHON, pre: [] }]
  : [
      { cmd: 'python', pre: [] },
      { cmd: 'py', pre: ['-3'] },
      { cmd: 'python3', pre: [] },
    ];

function findEngine() {
  for (const root of ENGINE_ROOTS) {
    const script = join(root, 'scripts', 'search.py');
    if (existsSync(script)) return { root, script };
  }
  return null;
}

/** Probe an interpreter by version string; rejects the Windows Store stub. */
function probePython(cand) {
  const r = spawnSync(cand.cmd, [...cand.pre, '--version'], { encoding: 'utf8' });
  if (r.error) return null;
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const m = out.match(/Python 3\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { ...cand, version: m[0] };
}

function findPython() {
  for (const cand of PYTHON_CANDIDATES) {
    const ok = probePython(cand);
    if (ok) return ok;
  }
  return null;
}

function fail(lines) {
  process.stderr.write(`${lines.join('\n')}\n`);
  process.exit(2);
}

function runEngine(python, script, args) {
  return spawnSync(python.cmd, [...python.pre, script, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function engineMissingReport() {
  return [
    'frontend-master 数据层：检索引擎未找到。',
    '',
    '检索层需要 ui-ux-pro-max 的 BM25 引擎（scripts/search.py + data/*.csv）。已查找：',
    ...ENGINE_ROOTS.map((p) => `  - ${p}`),
    '',
    '修复方式（任选其一）：',
    '  1. 把 ui-ux-pro-max 放到上面任一位置',
    '  2. 设置环境变量 FRONTEND_MASTER_DATA_DIR=<ui-ux-pro-max 的路径>',
    '',
    '降级路径（数据层不可用时照样能工作）：',
    '  改用 references/02-aesthetic-directions.md 的 12 个具名方向 token 配方——',
    '  静态、自包含、零外部依赖。检索层是增强，不是前置条件。',
  ];
}

function pythonMissingReport(engine) {
  return [
    `frontend-master 数据层：检测到引擎（${engine.script}），但找不到可用的 Python 3。`,
    '',
    '已尝试：' + PYTHON_CANDIDATES.map((c) => [c.cmd, ...c.pre].join(' ')).join(' / '),
    '',
    '修复方式：',
    '  1. 安装 Python 3 并确保在 PATH 中',
    '  2. 或设置 FRONTEND_MASTER_PYTHON=<python 可执行文件路径>',
    '',
    '降级路径：改用 references/02-aesthetic-directions.md 的静态方向配方。',
  ];
}

function catalogCounts(engine) {
  const p = join(engine.root, 'data', 'catalog-summary.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8')).counts || null;
  } catch {
    return null;
  }
}

/** Pull the argparse choices list for an option out of --help output. */
function choicesFromHelp(help, option) {
  const re = new RegExp(`${option}[^\\n]*?\\{([^}]*)\\}`);
  const m = help.match(re);
  return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
}

function printCheck(engine, python) {
  console.log('frontend-master 数据层自检');
  console.log('='.repeat(44));
  console.log(`引擎根目录 : ${engine.root}`);
  console.log(`检索引擎   : ${engine.script}`);
  console.log(
    python
      ? `Python     : ${python.cmd} ${python.pre.join(' ')} (${python.version})`.replace('  ', ' ')
      : 'Python     : 未找到',
  );

  const counts = catalogCounts(engine);
  if (counts) {
    console.log('');
    console.log('数据规模（catalog-summary.json）：');
    for (const [k, v] of Object.entries(counts)) {
      const val = typeof v === 'object' ? JSON.stringify(v) : v;
      console.log(`  ${k.padEnd(20)} ${val}`);
    }
  }

  if (python) {
    const help = runEngine(python, engine.script, ['--help']);
    const text = `${help.stdout || ''}${help.stderr || ''}`;
    const domains = choicesFromHelp(text, '--domain');
    const stacks = choicesFromHelp(text, '--stack');
    if (domains.length) {
      console.log('');
      console.log(`可用 domain (${domains.length})：${domains.join(', ')}`);
    }
    if (stacks.length) {
      console.log(`可用 stack  (${stacks.length})：${stacks.join(', ')}`);
    }
  }

  console.log('');
  console.log(python ? '状态：可用。' : '状态：引擎在，Python 缺失 —— 走 references/02 降级路径。');
  process.exit(python ? 0 : 2);
}

// ---------------------------------------------------------------- main

const argv = process.argv.slice(2);
const engine = findEngine();

if (!engine) {
  fail(engineMissingReport());
}

const sub = argv[0];
if (sub === 'check' || sub === '--check' || sub === 'domains') {
  printCheck(engine, findPython());
}

const python = findPython();
if (!python) {
  fail(pythonMissingReport(engine));
}

const result = runEngine(python, engine.script, argv);

if (result.error) {
  fail([`frontend-master 数据层：执行失败 —— ${result.error.message}`]);
}

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

process.exit(result.status ?? 1);
