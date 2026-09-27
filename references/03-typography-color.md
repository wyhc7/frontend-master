# 03 · 排版与色彩系统

P2/P3 阶段使用。排版与色彩是**两套可判定的数值系统**：所有取值都能被机器检查，也都能被反驳。写码前读一遍，交付前跑 `scripts/audit.mjs`。

## A. 模块化字阶

根字号 `16px`，正文 `1rem`。字阶比率由 `VISUAL_DENSITY` 决定，不许自由取值：

| VISUAL_DENSITY | 比率 | 理由 |
|---|---|---|
| 1–3 | `1.333`（四度） | 大留白、一屏一个信息，需要大字跨度 |
| 4–6 | `1.25`（三度） | 默认工作比率 |
| 7–10 | `1.2`（小二度） | 密集界面，相邻层级必须挤得近才可扫读 |

`1.2` 步进 `1.2 / 1.44 / 1.728 / 2.074 / 2.488`；`1.333` 步进 `1.333 / 1.777 / 2.369 / 3.157 / 4.209`。

移动端与桌面端**不是同一套字阶**：≤480px 时标题整体降一档，字距收紧程度减半，行高 `+0.05`。实现方式是 `clamp()`，两端分别是 375px 与 1440px 视口下的目标字号：

```css
:root {
  --step--1: clamp(0.875rem, 0.84rem + 0.15vw, 0.9375rem);   /* 14 → 15 */
  --step-0:  1rem;                                            /* 16 → 16 */
  --step-1:  clamp(1.125rem, 1.07rem + 0.23vw, 1.25rem);      /* 18 → 20 */
  --step-2:  clamp(1.25rem, 1.14rem + 0.47vw, 1.5625rem);     /* 20 → 25 */
  --step-3:  clamp(1.5625rem, 1.425rem + 0.59vw, 1.953rem);   /* 25 → 31 */
  --step-4:  clamp(1.953rem, 1.78rem + 0.73vw, 2.441rem);     /* 31 → 39 */
  --step-5:  clamp(2.441rem, 2.23rem + 0.92vw, 3.052rem);     /* 39 → 49 */
  --step-6:  clamp(3.052rem, 2.78rem + 1.15vw, 3.815rem);     /* 49 → 61 */
}
```

`clamp()` 三参数有数学约束：`vw 系数 = (桌面px − 移动px) × 100 / 1065`，`截距 = 移动px − 系数 × 3.75`。随手写的 clamp 会在中间视口反常或跳变。

## B. 字号 / 行高 / 字距规则表

| 角色 | 字号 | 行高 | 字距 | 字重 |
|---|---|---|---|---|
| Display（首屏主角） | 48–96px | `1.02–1.10` | `-0.02em` ~ `-0.035em` | 500–700 |
| H1 | 32–48px | `1.10–1.20` | `-0.02em` | 500–700 |
| H2 | 24–32px | `1.15–1.25` | `-0.01em` | 500–650 |
| H3 | 18–22px | `1.25–1.35` | `-0.005em` | 500–600 |
| 正文（无衬线） | 15–18px | `1.5–1.65` | `0` ~ `+0.005em` | 400 |
| 正文（衬线） | 16–19px | `1.55–1.75` | `0` | 400 |
| 小字 / 说明 | 13–14px | `1.40–1.50` | `+0.005em` | 400–500 |
| 全大写标签 | 11–12px | `1.20` | `+0.08em` ~ `+0.12em` | 500–600 |
| 数字 / 代码 | 13–15px | `1.40–1.55` | `0` | 400–500 |

硬约束：正文行长 `45–80ch`、容器 `max-width: 62ch`，超 90ch 判定失败；字号越大字距越小（反向只允许在 Brutalist 方向）；负字距配紧行高、正字距配松行高；全大写标签只允许出现一处且必须携带分类信息（否则命中 `07` 的 B2）。

## C. 字对选取

数据层有 **74 组真实字对**（含 `Heading Font` / `Body Font` / `Mood Keywords` / `Best For` / `CSS Import` / `Tailwind Config`），按语义检索而非按记忆：

```bash
node ~/.dsh/skills/frontend-master/scripts/data.mjs "editorial magazine print" --domain typography --max-results 3
node ~/.dsh/skills/frontend-master/scripts/data.mjs "academic accessible" --domain typography --max-results 3
```

已核实的真实条目（可直接取用）：

| 名称 | Heading + Body | 适用 |
|---|---|---|
| `Magazine Style` | Libre Bodoni + Public Sans | 杂志、专栏、出版 |
| `Fashion Forward` | Syne + Manrope | 时尚、创意机构、画廊 |
| `Developer Mono` | JetBrains Mono + IBM Plex Sans | 开发工具、文档、CLI |
| `Academic/Research` | Crimson Pro + Atkinson Hyperlegible | 学术、研究、教育 |
| `Luxury Minimalist` | Bodoni Moda + Jost | 高客单、克制奢华 |
| `Neubrutalist Bold` | Lexend Mega + Public Sans | 新粗野、青年文化 |
| `Chinese Simplified` | Noto Sans SC（单族） | 中文正文必须预留此栈 |

配额：**最多两族 + 一个等宽**，且两族需在至少一个轴上一眼可分（衬线/无衬线、窄/宽、高对比/低对比）。`Inter + Inter` 这类单族方案只在方向本身要求极致中性时用，并要说出理由。

**禁用清单**（不论方向）：`Playfair Display` 作主字体（数据层有 4 组字对用到它，全部跳过）；`Playfair Display + Inter`（`Classic Elegant`）——2023 年后最典型的生成痕迹组合；暖奶油底 `#F4F1EA` + 陶土强调 `#D97757` 与字对同时出现即双重命中；`Poppins` / `Montserrat` / `Roboto` / `Space Grotesk` 作无差别主字体（`07` B5）。

## D. 可变字体

**optical size（`opsz`）**的唯一职责是按实际字号自动选光学尺寸：`font-optical-sizing: auto`（默认值，显式声明以锁定意图）。一旦写了 `font-variation-settings: "opsz" 40`，自动行为立刻失效——该元素所有字号都用 40 的光学形态渲染，小字过瘦、大字过肥。只在同一元素跨越 3 个以上字号层级时才手动指定，并用媒体查询或 `@container` 分档，不要全局写死。

**`font-variation-settings` 与 `font-weight` 的取舍**：

- 有对应 CSS 属性的轴一律用 CSS 属性：`wght` → `font-weight`、`wdth` → `font-stretch`、`slnt` → `font-style: oblique`。它们参与继承、可被主题覆盖、可被 `!important` 纠正。
- 两者同时作用于 `wght` 时，`font-variation-settings` 胜出，等于静默废掉组件的 `font-weight`（按钮、加粗文本全部失效）。这是最常见的可变字体事故。
- 只有无 CSS 属性对应的自定义轴才写 `font-variation-settings`，如 Fraunces 的 `SOFT`（0–100）、`WONK`（0–1），或字体的 `GRAD`：

```css
.display {
  font-family: "Fraunces", Georgia, serif;
  font-weight: 600;                              /* wght 走标准属性 */
  font-variation-settings: "SOFT" 40, "WONK" 1;  /* 只放自定义轴 */
}
```

字体轴动画会重排字形与文字度量，**禁止**用于滚动或入场动效（违反 `04` 的合成器规则）；只在尺寸已固定的单个 hover 目标上使用。

## E. 数字排版

`font-variant-numeric: tabular-nums` 让数字等宽，只在三处用：表格数字列与小数对齐；实时数值（价格、计数、倒计时、进度、仪表盘读数）——值变化时不许左右跳动；同行需要垂直对齐的指标组。

不用的三处：散文正文里的零散数字（`1965`、`第 3 章`——等宽数字字距不均，破坏行气）；Display 级大数字（比例数字字形更协调，只有多个大数字需成列对齐时才切回）；短标题里的年份与页码标题。

补充：区分 `0` 与 `O` 用 `font-feature-settings: "zero" 1`（仅当字体提供 slashed zero）；数字列必须右对齐；单位（`¥`、`%`、`ms`）与数值分离成不同元素，否则单位随位数漂移。

## F. 色彩 token 分层

最少 5 个命名 token，**只给一个主色视为未完成**。命名用角色，不用色相或数字（禁止 `--blue-500` / `--color-1`）。

| Token | 职责 | 约束 |
|---|---|---|
| `--paper` | 页面底色 | 决定其余全部对比度基线；除 Swiss/Brutalist 外不用纯 `#FFF` |
| `--ink` | 主文字 | 与 `--paper` ≥ `4.5:1` |
| `--muted` | 次要文字、元信息 | 与 `--paper` ≥ `4.5:1`（正文级）或 ≥ `3:1`（大字级） |
| `--line` | 分隔线、边框、输入框边界 | 与 `--paper` 明度差 8–15%；靠明度差而非色相表达层级 |
| `--accent` | 强调 | 覆盖面积 ≤ 全页 5%；必须同时给出 `--on-accent` |
| `--surface` | 抬升面（卡片、面板） | 与 `--paper` 有可辨明度差；暗模式下层级全靠它 |
| `--pos` / `--warn` / `--neg` | 状态 | 每个都必须配图标或文字（见 I） |

`--accent` 与 `--on-accent` 成对：`--on-accent` 只能放在 `--accent` 上，不许挪到 `--paper`。检索引出的 `On Primary` / `On Accent` 是配对色而非独立选色，必须整组使用（见 J）。

## G. 对比度：确切阈值与检查方法

| 内容 | 最低比值 | 依据 |
|---|---|---|
| 正文文字（< 24px 且非粗体） | **4.5:1** | SC 1.4.3 |
| 大字（≥ 24px，或 ≥ 18.66px 且 bold） | **3:1** | SC 1.4.3 |
| 非文本：图标、边框、焦点环、图表线条 | **3:1** | SC 1.4.11 |
| 状态色与背景 | **3:1**，且必须配非色线索 | SC 1.4.1 |

不达即缺陷，没有"接近达标"。检查顺序：

1. DevTools 的 contrast 徽标逐个复核正文与放大字，从计算值读数，不靠肉眼。
2. 半透明色**先做 alpha 合成再算比值**（`合成通道 = α × 前景 + (1 − α) × 背景`），否则结果偏乐观。
3. 用标准相对亮度公式自算，避免工具误判 `rgba()`：

```js
const lum = (hex) => [1, 3, 5]
  .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
```

4. `axe-core` / Lighthouse 做全页批量复核，但**焦点环与自定义控件的对比度必须手测**，自动化工具默认跳过。

## H. 暗模式：不是把颜色反转

反转（`filter: invert(1)` 或算法换算）会同时摧毁色相语义、图片、品牌色与对比度梯度。正确做法四条：

1. **独立调色**：暗模式是另一组 token 值，不是亮模式的函数。数据层 192 套配色中有 **43 套本身就是深底方案**（如 `Financial Dashboard`：Bg `#020617` / Fg `#F8FAFC` / Card `#0E1223`），取用比反算可靠。
2. **不用纯黑纯白**：底色用带色相的近黑（`#020617`、`#0F172A`、`#0F0F23`），前景不用 `#FFF`（用 `#F8FAFC`、`#E2E8F0`）；保留 12:1 以上明度差即可，不需要 21:1。
3. **降饱和、提亮强调色**：同一饱和度的强调色在暗底上视觉强度倍增，必须提亮并略降饱和。暗底边框**带色相而非灰**——数据层深色方案的 Border 就是带色相的（`#334155`、`#312E81`、`#4C1D95`、`#3F3F46`）。
4. **层级改用明度差与描边**：阴影在暗底上几乎不可见，用 `1px` 描边 + 表面明度阶（`#020617` → Card `#0E1223` → Muted）表达抬升；图片与插画需要独立暗版处理（降亮 + 单层 overlay），复用亮版素材即缺陷。

消费级页面必须两模式都测，见 `SKILL.md` Quality Floor 第 7 条。

## I. 状态色语义化

颜色**单独**承载语义即违反 SC 1.4.1，每个状态必须三重编码：

| 状态 | 颜色 | 必需的非色线索 |
|---|---|---|
| 成功 | `--pos` 族 | 对勾类图标 + 说明结果的文案 |
| 警告 | `--warn` 族 | 三角类图标 + 说明影响范围的文案 |
| 错误 | `--neg`（表单）/ `--destructive`（破坏性操作） | 图标 + 就近文字 + `aria-describedby`，说明发生什么与怎么修 |
| 进行中 | 中性或 `--accent` | 进度数值或文字，不能只转圈 |

状态色**不许**当强调色使用（用错误红做 CTA 会让用户以为操作危险）；红绿不并置作为唯一区分手段；破坏性按钮必须在形状或位置上也可区分，不能只有颜色差别。

## J. 色彩检索

数据层有 **192 套完整产品配色**，每套含 18 个角色列：`Primary` / `On Primary` / `Secondary` / `On Secondary` / `Accent` / `On Accent` / `Background` / `Foreground` / `Card` / `Card Foreground` / `Muted` / `Muted Foreground` / `Border` / `Destructive` / `On Destructive` / `Ring`。

```bash
node ~/.dsh/skills/frontend-master/scripts/data.mjs "financial dashboard" --domain color --max-results 3
node ~/.dsh/skills/frontend-master/scripts/data.mjs domains   # 查看各 domain 规模
```

- **整组取用**，不要只抄 `Primary`——`On Primary` 是为它测过对比度的配对色，拆开即失去意义。
- `Ring` 直接用作 `:focus-visible` 的焦点环颜色，保证与品牌色同源。
- 取到的组必须按 F 重写成角色命名（`--paper` / `--ink` / `--accent` / `--on-accent` / `--muted` / `--line` / `--surface` / `--pos` / `--neg`），不要把 CSV 字段名塞进 CSS。
- 参考真实取值：`SaaS (General)` = P `#2563EB` / OnP `#FFFFFF` / Accent `#EA580C` / Bg `#F8FAFC` / Fg `#1E293B` / Muted `#E9EFF8` / Border `#E2E8F0` / Destructive `#DC2626`。

## K. 与 07 衔接：最典型的生成痕迹配色

| 痕迹 | 为什么是 tell | 替代 |
|---|---|---|
| 暖奶油 `#F4F1EA` + 陶土 `#D97757` | 已成簇的"温柔专业"默认配方，与主题无关地出现 | 冷白纸面 + 印刷红；或补足 moss/sand 与真实材质对冲 |
| `#0B0B0B` 假纯黑 + 高饱和酸绿/朱红 | 同一配方出现在 SaaS、作品集、AI 工具页 | 黑带色相（`hsl(220 45% 8%)`）或真 `#000` 靠材质分层 |
| `linear-gradient(135deg, #667eea, #764ba2)` | 洗色代替设计 | 纯色 + 噪点/网格/纸纹；渐变只在承载意义时用 |
| Tailwind 默认 indigo/violet 当"现代感" | 未经过选择的选择 | 从 192 套里取一组，并按方向改一处 |
| 全站一个饱和主色 + 大面积浅灰底 | 单色系统，没有层级 | 分层 5–6 个 token，`--accent` 面积 ≤5% |
| `filter: invert(1)` 生成暗模式 | 色相语义与对比度同时失控 | 独立调色（见 H） |
| 状态只用颜色（红/绿文字） | 违反 SC 1.4.1，一眼看出没测过 | 颜色 + 图标 + 文案三重编码（见 I） |

## 交付前检查

1. 字阶由比率推出，`clamp()` 三参数满足 A 的公式；正文 ≤ 80ch，行高在 B 的表内。
2. 主字体不在 C 的禁用清单里；字族不超过两族 + 等宽。
3. 每个文字/背景组合都算过比值，达到 G 的阈值。
4. 暗模式有独立取值，不是反算结果；两模式都截图看过。

```bash
node ~/.dsh/skills/frontend-master/scripts/audit.mjs ./src
```
