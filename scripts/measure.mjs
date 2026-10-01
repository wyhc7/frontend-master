#!/usr/bin/env node
/**
 * frontend-master visual measurement — the artifact-level gate.
 *
 * audit.mjs reads SOURCE. This reads the RENDERED RESULT, because the most
 * common dark-theme defect is invisible to the eye: the whole page sitting
 * 2-3x brighter than intended. Your monitor lies to you; numbers do not.
 *
 * Zero dependencies. PNG decoding (signature, chunks, zlib inflate, all five
 * filter types) is implemented here on top of node:zlib. JPEG is transcoded
 * through ffmpeg when it happens to be installed.
 *
 * Usage:
 *   node scripts/measure.mjs shot.png
 *   node scripts/measure.mjs shot.png --ref reference.png
 *   node scripts/measure.mjs shot.png --grid
 *   node scripts/measure.mjs shot.png --json
 *   node scripts/measure.mjs shot.png --bg     # sample the background field only
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import zlib from 'node:zlib';

// ------------------------------------------------------------ PNG decoding

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const COLOR_NAME = {
  0: '灰度',
  2: 'RGB',
  3: '调色板',
  4: '灰度+alpha',
  6: 'RGBA',
};

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Reverse one scanline in place, using already-decoded left/up neighbours. */
function unfilterInPlace(raw, stride, height, bpp) {
  const out = Buffer.alloc(stride * height);
  let pos = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const ft = raw[pos];
    pos += 1;
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    line.copy(cur);
    switch (ft) {
      case 0:
        break;
      case 1:
        for (let i = bpp; i < stride; i += 1) cur[i] = (cur[i] + cur[i - bpp]) & 0xff;
        break;
      case 2:
        for (let i = 0; i < stride; i += 1) cur[i] = (cur[i] + prev[i]) & 0xff;
        break;
      case 3:
        for (let i = 0; i < stride; i += 1) {
          const a = i >= bpp ? cur[i - bpp] : 0;
          cur[i] = (cur[i] + ((a + prev[i]) >> 1)) & 0xff;
        }
        break;
      case 4:
        for (let i = 0; i < stride; i += 1) {
          const a = i >= bpp ? cur[i - bpp] : 0;
          const c = i >= bpp ? prev[i - bpp] : 0;
          cur[i] = (cur[i] + paeth(a, prev[i], c)) & 0xff;
        }
        break;
      default:
        throw new Error(`未知的 PNG 滤波类型 ${ft}（第 ${y} 行）——文件可能已损坏`);
    }
    prev = cur;
  }
  return out;
}

function decodePng(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error('不是 PNG 文件（签名不匹配）');
  }

  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  let interlace = 0;
  let plte = null;
  let trns = null;
  const idat = [];

  let off = 8;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'PLTE') {
      plte = data;
    } else if (type === 'tRNS') {
      trns = data;
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }

  if (!width || !height) throw new Error('PNG 缺少 IHDR');
  if (!idat.length) throw new Error('PNG 缺少 IDAT');
  if (interlace) throw new Error('不支持交错（Adam7）PNG——请导出为非交错');
  if (![1, 2, 4, 8].includes(bitDepth) && bitDepth !== 16) {
    throw new Error(`不支持的位深 ${bitDepth}`);
  }
  const channels = CHANNELS[colorType];
  if (!channels) throw new Error(`不支持的颜色类型 ${colorType}`);
  if (colorType === 3 && !plte) throw new Error('调色板 PNG 缺少 PLTE');

  const raw = zlib.inflateSync(Buffer.concat(idat));

  // Sub-byte depths are only legal for grey / palette, where one sample per
  // pixel is the rule.
  const bytesPerSample = bitDepth === 16 ? 2 : 1;
  const bitsPerPixel = channels * bitDepth;
  const bpp = Math.max(1, Math.ceil(bitsPerPixel / 8));
  const stride = Math.ceil((width * bitsPerPixel) / 8);

  const expected = (stride + 1) * height;
  if (raw.length < expected) {
    throw new Error(`IDAT 解压后不足（需要 ${expected} 字节，得到 ${raw.length}）`);
  }

  const flat = unfilterInPlace(raw, stride, height, bpp);

  // Normalise everything to RGBA8.
  const rgba = Buffer.alloc(width * height * 4);
  const sample = (line, x, c) => {
    if (bitDepth === 16) return line[x * channels * 2 + c * 2];
    return line[x * channels + c];
  };

  for (let y = 0; y < height; y += 1) {
    const line = flat.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4;
      let r;
      let g;
      let b;
      let a = 255;
      if (bitDepth < 8) {
        const perByte = 8 / bitDepth;
        const byte = line[Math.floor(x / perByte)];
        const shift = 8 - bitDepth * ((x % perByte) + 1);
        const idx = (byte >> shift) & ((1 << bitDepth) - 1);
        const max = (1 << bitDepth) - 1;
        if (colorType === 3) {
          r = plte[idx * 3];
          g = plte[idx * 3 + 1];
          b = plte[idx * 3 + 2];
          if (trns && idx < trns.length) a = trns[idx];
        } else {
          r = g = b = Math.round((idx / max) * 255);
        }
      } else if (colorType === 0) {
        r = g = b = sample(line, x, 0);
      } else if (colorType === 2) {
        r = sample(line, x, 0);
        g = sample(line, x, 1);
        b = sample(line, x, 2);
      } else if (colorType === 4) {
        r = g = b = sample(line, x, 0);
        a = sample(line, x, 1);
      } else if (colorType === 6) {
        r = sample(line, x, 0);
        g = sample(line, x, 1);
        b = sample(line, x, 2);
        a = sample(line, x, 3);
      } else {
        const idx = sample(line, x, 0);
        r = plte[idx * 3];
        g = plte[idx * 3 + 1];
        b = plte[idx * 3 + 2];
        if (trns && idx < trns.length) a = trns[idx];
      }
      rgba[o] = r;
      rgba[o + 1] = g;
      rgba[o + 2] = b;
      rgba[o + 3] = a;
    }
  }

  return { width, height, rgba, bitDepth, colorType, channelsMap: COLOR_NAME[colorType] };
}

/** Accept a PNG, or transcode anything ffmpeg understands into one. */
function readImage(path) {
  const abs = resolve(path);
  if (!existsSync(abs)) throw new Error(`文件不存在：${abs}`);
  const buf = readFileSync(abs);
  if (buf.subarray(0, 8).equals(PNG_SIG)) return decodePng(buf);

  // Try ffmpeg for JPEG/WebP/etc.
  let out;
  try {
    out = execFileSync(
      'ffmpeg',
      ['-v', 'error', '-i', abs, '-f', 'image2', '-vcodec', 'png', '-'],
      { maxBuffer: 1 << 30 },
    );
  } catch {
    throw new Error(
      `${extname(abs) || '该格式'} 不是 PNG，且没有可用的 ffmpeg 转码。` +
        `转换后重试：ffmpeg -i "${abs}" out.png`,
    );
  }
  return decodePng(out);
}

// ----------------------------------------------------------------- analysis

/** Perceptual luminance, 0..255, computed on sRGB values. */
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function quantileFrom(hist, n, q) {
  if (!n) return 0;
  const target = Math.max(1, Math.ceil(q * n));
  let acc = 0;
  for (let i = 0; i < 256; i += 1) {
    acc += hist[i];
    if (acc >= target) return i;
  }
  return 255;
}

function analyze(img, stride = 1) {
  const { rgba, width, height } = img;
  const histL = new Uint32Array(256);
  const histR = new Uint32Array(256);
  const histG = new Uint32Array(256);
  const histB = new Uint32Array(256);
  let n = 0;
  let skipped = 0;
  let sumL = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const o = (y * width + x) * 4;
      if (rgba[o + 3] < 16) {
        skipped += 1;
        continue;
      }
      const r = rgba[o];
      const g = rgba[o + 1];
      const b = rgba[o + 2];
      const l = luma(r, g, b);
      histL[Math.round(l)] += 1;
      histR[r] += 1;
      histG[g] += 1;
      histB[b] += 1;
      sumL += l;
      sumR += r;
      sumG += g;
      sumB += b;
      n += 1;
    }
  }

  const q = (hist, p) => quantileFrom(hist, n, p);
  const meanL = n ? sumL / n : 0;
  const p10 = q(histL, 0.1);
  const p90 = q(histL, 0.9);
  const lum = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const contrast = (p90 + 0.05) / (p10 + 0.05);
  const wcag = (lum(p90) + 0.05) / (lum(p10) + 0.05);

  return {
    pixels: n,
    skipped,
    coverage: (n / ((Math.ceil(width / stride) * Math.ceil(height / stride)) || 1)) * 100,
    mean: { r: n ? sumR / n : 0, g: n ? sumG / n : 0, b: n ? sumB / n : 0, l: meanL },
    median: { r: q(histR, 0.5), g: q(histG, 0.5), b: q(histB, 0.5), l: q(histL, 0.5) },
    p05: { l: q(histL, 0.05) },
    p95: { l: q(histL, 0.95) },
    p10,
    p90,
    min: { l: histL.findIndex((v) => v > 0) },
    max: { l: 255 - [...histL].reverse().findIndex((v) => v > 0) },
    contrast,
    wcag,
    histL,
  };
}

function gridMedians(img, gx = 3, gy = 3) {
  const { rgba, width, height } = img;
  const cells = [];
  for (let cy = 0; cy < gy; cy += 1) {
    const row = [];
    for (let cx = 0; cx < gx; cx += 1) {
      const x0 = Math.floor((cx * width) / gx);
      const x1 = Math.floor(((cx + 1) * width) / gx);
      const y0 = Math.floor((cy * height) / gy);
      const y1 = Math.floor(((cy + 1) * height) / gy);
      const hist = new Uint32Array(256);
      let n = 0;
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const o = (y * width + x) * 4;
          if (rgba[o + 3] < 16) continue;
          hist[Math.round(luma(rgba[o], rgba[o + 1], rgba[o + 2]))] += 1;
          n += 1;
        }
      }
      row.push({ median: quantileFrom(hist, n, 0.5), pixels: n });
    }
    cells.push(row);
  }
  return cells;
}

const f = (v, w = 7, d = 1) => v.toFixed(d).padStart(w);

function verdictFor(s) {
  const m = s.median.l;
  if (m < 5) return ['死黑', '中位亮度 < 5：多半是纯 #000 底，暗部细节已经压没了。给底板留一点环境光。'];
  if (m <= 30) return ['暗场', '中位亮度落在常见的暗场区间（5–30）。'];
  if (m < 60) return ['偏暗的中间调', '中位亮度 30–60：对暗色主题来说偏亮。确认这是有意为之，而不是"暗色主题"没做下去。'];
  if (m <= 200) return ['亮场 / 中灰', '中位亮度偏高，确认是不是被整体提亮了。'];
  return ['过曝', '中位亮度 > 200：大面积接近纯白，反差和层次都会丢掉。'];
}

function report(name, img, s, opts) {
  const A = 8; // ASCII columns are 1 wide; the CJK label column stays out of them
  const N = 8;
  const cell = (v, d = 1) => f(v, N, d);

  const lines = [];
  const dim = `${img.width}×${img.height}`;
  lines.push(`${name}  ${dim}  ${img.channelsMap} ${img.bitDepth}-bit${opts.stride > 1 ? `  (采样步长 ${opts.stride})` : ''}`);
  lines.push('');
  lines.push(`${' '.repeat(A)}${'R'.padStart(N)}${'G'.padStart(N)}${'B'.padStart(N)}${'lum'.padStart(N)}`);
  lines.push(`${'mean'.padEnd(A)}${cell(s.mean.r)}${cell(s.mean.g)}${cell(s.mean.b)}${cell(s.mean.l)}`);
  lines.push(`${'median'.padEnd(A)}${cell(s.median.r, 0)}${cell(s.median.g, 0)}${cell(s.median.b, 0)}${cell(s.median.l, 0)}`);
  lines.push('');
  lines.push(`亮度分布  p05 ${s.p05.l} · p50 ${s.median.l} · p95 ${s.p95.l} · min ${s.min.l} · max ${s.max.l}`);
  lines.push('');

  if (s.skipped) {
    lines.push(`透明像素已剔除：${s.skipped}（占 ${(100 - s.coverage).toFixed(1)}%）`);
    lines.push('');
  }

  const [label, why] = verdictFor(s);
  lines.push(`判定：${label}`);
  lines.push(`  ${why}`);
  lines.push('');

  const spread = s.p90 - s.p10;
  if (spread < 20) {
    lines.push(
      `图内反差极小（p90 ${s.p90} vs p10 ${s.p10}）——纯色或近似纯色的画面上，对比度指标不适用。`,
    );
  } else {
    lines.push(`前景/背景粗估对比度：${s.wcag.toFixed(2)}:1（p90 ${s.p90} vs p10 ${s.p10}，sRGB 线性化后按 WCAG 公式）`);
    lines.push('  这是整图粗估，不能替代对具体文字色的计算——正文仍需按 03 的阈值核对。');
  }
  return lines;
}

// --------------------------------------------------------------------- main

function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    if (i === -1) return null;
    const next = args[i + 1];
    return next && !next.startsWith('--') ? next : true;
  };
  const targets = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--ref');

  if (!targets.length) {
    process.stderr.write(
      '用法: node scripts/measure.mjs <截图.png> [--ref 参考.png] [--grid] [--json]\n' +
        '      非 PNG 会自动尝试用 ffmpeg 转码。\n',
    );
    process.exit(2);
  }

  const strideRaw = flag('--stride');
  const stride = typeof strideRaw === 'string' ? Math.max(1, Number(strideRaw) || 1) : 1;

  let img;
  let s;
  try {
    img = readImage(targets[0]);
    s = analyze(img, stride);
  } catch (err) {
    process.stderr.write(`读取失败：${err.message}\n`);
    process.exit(2);
  }

  const jsonOut = flag('--json');
  const r2 = (v) => Number(v.toFixed(2));
  const refPath = flag('--ref');
  let ref = null;
  let refStats = null;
  if (typeof refPath === 'string') {
    try {
      ref = readImage(refPath);
      refStats = analyze(ref, stride);
    } catch (err) {
      process.stderr.write(`参考图读取失败：${err.message}\n`);
      process.exit(2);
    }
  }

  // A reference that disagrees by more than 2x exits non-zero, so this can be
  // wired into a gate rather than only read by a human.
  const ratioOf = (v, ref) => v / (ref || 1);
  const offFromReference = refStats
    ? ratioOf(s.mean.l, refStats.mean.l) > 2 || ratioOf(s.mean.l, refStats.mean.l) < 0.5
    : false;

  if (jsonOut) {
    const payload = {
      file: resolve(targets[0]),
      size: `${img.width}x${img.height}`,
      format: `${img.channelsMap} ${img.bitDepth}-bit`,
      stats: {
        mean: { r: r2(s.mean.r), g: r2(s.mean.g), b: r2(s.mean.b), l: r2(s.mean.l) },
        median: s.median,
        p05: s.p05.l,
        p95: s.p95.l,
        min: s.min.l,
        max: s.max.l,
        contrast: r2(s.wcag),
        pixels: s.pixels,
        skipped: s.skipped,
      },
      verdict: verdictFor(s)[0],
    };
    if (refStats) {
      payload.reference = {
        file: resolve(refPath),
        meanL: r2(refStats.mean.l),
        medianL: refStats.median.l,
      };
      payload.delta = {
        meanRatio: r2(ratioOf(s.mean.l, refStats.mean.l)),
        medianRatio: r2(ratioOf(s.median.l, refStats.median.l)),
        beyondTolerance: offFromReference,
      };
    }
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exit(offFromReference ? 1 : 0);
  }

  for (const line of report(targets[0], img, s, { stride })) process.stdout.write(`${line}\n`);

  if (refStats) {
    const rm = refStats.mean.l || 1;
    const rmd = refStats.median.l || 1;
    const ratio = s.mean.l / rm;
    const medRatio = s.median.l / rmd;
    process.stdout.write('\n');
    process.stdout.write(`与参考对比：${refPath}\n\n`);
    process.stdout.write('              参考      实际       倍率\n');
    process.stdout.write(`亮度 mean    ${f(refStats.mean.l)} ${f(s.mean.l)}  ${f(ratio, 9, 2)}×${ratio > 2 || ratio < 0.5 ? '  ⚠' : ''}\n`);
    process.stdout.write(`亮度 median  ${f(rmd, 7, 0)} ${f(s.median.l, 7, 0)}  ${f(medRatio, 9, 2)}×${medRatio > 2 || medRatio < 0.5 ? '  ⚠' : ''}\n`);
    process.stdout.write('\n');
    if (ratio > 2 || ratio < 0.5) {
      process.stdout.write('均值偏离参考超过 2 倍。这通常不是"调色没调好"，而是管线里多做了一次\n');
      process.stdout.write('线性 → sRGB 编码（或漏了一次）。先去查编码链路，不要用调色去补。\n');
    } else {
      process.stdout.write('与参考同档。\n');
    }
  }

  if (flag('--grid')) {
    const cells = gridMedians(img, 3, 3);
    const base = s.median.l || 1;
    process.stdout.write('\n3×3 分块中位亮度\n\n');
    for (const row of cells) {
      process.stdout.write(`${row.map((c) => String(c.median).padStart(6)).join('')}\n`);
    }
    process.stdout.write('\n');
    const outliers = [];
    cells.forEach((row, ry) => {
      row.forEach((c, rx) => {
        const r = c.median / base;
        if (r > 1.8 || r < 0.55) outliers.push(`第 ${ry + 1} 行第 ${rx + 1} 列（中位 ${c.median}，是全图的 ${r.toFixed(2)}×）`);
      });
    });
    if (outliers.length) {
      process.stdout.write('分块显著偏离全图：\n');
      for (const o of outliers) process.stdout.write(`  - ${o}\n`);
      process.stdout.write('\n检查这些区域是不是过曝、死黑，或者有一个不该出现的亮块（浮层、hover 态、骨架屏残留）。\n');
    } else {
      process.stdout.write('分块亮度均匀，没有局部过曝或死黑。\n');
    }
  }

  process.exit(offFromReference ? 1 : 0);
}

main();
