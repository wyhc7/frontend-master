# frontend-master

> 最强前端 Agent Skill：八源融合 + 可机器验证的自检闭环。目标是产出**不像 AI 做的前端**，而且这个判断由机器复核，不由感觉决定。

## 它解决什么问题

AI 写前端有两个顽疾：一是**一眼 AI**（统一圆角、同一个柔和阴影、每屏"居中大标题 + 三张卡"、紫靛渐变、`Lorem ipsum`），二是**不可验证**（"看起来不错"无法反驳，也没法回归）。这个 skill 对两者分别给出机制：前者是显式的 AI-tells 黑名单与具名审美方向，后者是能跑出退出码的审计器。

## 八源融合

| 来源 | 拿走的核心机制 |
|---|---|
| `anthropics/skills` → frontend-design | 设计主导者视角、两遍法（先出提案再实现）、反默认美学簇、"把胆量花在一处" |
| Vercel `web-interface-guidelines` | 界面规范审查以 `file:line` 落地、正确性优先于品味 |
| Vercel `react-best-practices` | 按影响分级的性能规则 |
| `taste-skill` | Design Read 前置、三旋钮量化、AI-tells 黑名单、依赖验证 |
| `pbakaus/impeccable` | 设计操作符（polish / bolder / quieter / distill / delight） |
| `ui-ux-pro-max` | BM25 设计智能检索层：88 风格 · 192 产品配色 · 74 官方字对 · 119 UX 规则 · 44 React 性能规则 · 17 动效预设 · 22 技术栈 |
| `greensock/gsap-skills`（GSAP 官方） | 网页动效实现层：核心 API、时间轴、ScrollTrigger、**插件已全免费**（Webflow 收购后）、React 与框架集成、性能红线 |
| `emilkowalski/skills` | 动效品味与标准：频率门（该不该动）、缓动决策树、时长分档、物理性禁令、可打断性、逐帧验证 |
| `HRuiCcc/RuiC-motion-reel` | **反默认抽签制**（自选方向总会滑向最响的那一张，所以默认是抽签而不是重复）、每张风格牌带一条「最容易做坏」、**量产物而非看感觉**（亮度对着参考量到 mean/median/p95） |

`RuiC-motion-reel` 是 Python + ffmpeg 的**视频动态图形**产线，赛道与网页不同——只借上面这三个机制，不借它的引擎与实现。

这些来源都缺的一环由本 skill 补上：**可机器验证的自检闭环**——`audit.mjs` 读源码（`motion/*` 规则让动效质量进得了门禁），`measure.mjs` 读渲染产物（让"亮了多少"成为可判定的数字）。

## 核心设计：两条知识层的仲裁

本 skill 同时持有两套设计知识，它们**不是并列关系，是层级关系**：

| 层 | 内容 | 何时用 | 权威性 |
|---|---|---|---|
| **静态层** | 12 个具名审美方向（`references/02`） | 默认 | 已人工审核过抗 AI 味，是本 skill 的立场 |
| **检索层** | BM25 引擎的 88 风格 / 192 配色 / 74 字对 / 22 技术栈 | 简报点名了具体风格、需要品类适配时 | 市场风格库，**未经抗 AI 味审核** |

冲突时的仲裁规则：检索层返回的风格若命中 AI-tells 黑名单（`Glassmorphism`、`Claymorphism`、`Neumorphism`、`Aurora UI`、紫靛渐变、纯黑底 + 高饱和强调色等），**不许静默采用**——要么改选静态层方向，要么写出明确的对冲措施。

这条规则不是纸面规定，有实证：检索层的 `--design-system` 对一个独立咖啡烘焙品牌推荐的是 `Minimalism` + trust blue/orange CTA + `Hero + Features + CTA` 三件套——正是黑名单里点名的那套生成痕迹。让检索层直接说话，产出的就是标准 AI 味页面。

## 五阶段流程

```
P0 读场 → P1 定方向 → P2 落 token → P3 实现 → P4 自检
        ↑______________________________|
              不通过则回到 P1 或 P3
```

- **P0** 先输出一行 `Design Read`，把隐含判断摆上台面好被推翻
- **P1** 选一个**具名**方向（不是"现代、简洁、专业"）——**没被点名时由抽签决定**（`style_lottery.mjs`，结果落盘成 `STYLE.md`），同时定三个旋钮 `DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY`
- **P2** 先产出 token 系统（命名色、字体角色、布局概念），再写组件
- **P3** 按 `references/` 的硬规则实现
- **P4** 两条独立证据：机器审计（零容忍）+ 产物量化与截图复核（先量，再看）

## 目录结构

```
SKILL.md                     主入口：流程 + 两库仲裁 + Quality Floor + AI-tells
references/
  01-design-read.md          需求推断与旋钮推导
  02-aesthetic-directions.md 12 个具名方向的完整 token 配方
  03-typography-color.md     字阶、字对、色彩 token 分层、WCAG 阈值、暗模式
  04-motion.md               频率门、三档强度、缓动决策树、物理性禁令、reduced-motion
  05-layout-architecture.md  栅格、间距刻度、密度映射、响应式、层叠
  06-engineering.md          React 性能分级、依赖验证、无障碍条款、CLS
  07-ai-tells.md             反 AI 味黑名单（写码前必读）
  08-critique.md             评审协议、严重度分级、六个操作符判定
  09-copy.md                 界面文案、错误公式、空态、中英混排
  10-web-animation.md        动效实现层：库路由、GSAP、ScrollTrigger、手势、逐帧验证
scripts/
  audit.mjs                  P4 机器审计器：读源码，按文件类型分派规则
  measure.mjs                P4 产物量化：读渲染结果，零依赖 PNG 解码
  style_lottery.mjs          P1 抽签定方向（12 张牌 + 响度标注 → STYLE.md）
  data.mjs                   检索层桥接（转发到 BM25 引擎）
  selftest/                  正反向回归夹具
```

## 安装

```bash
# DSH
cp -r frontend-master ~/.dsh/skills/

# Claude Code
cp -r frontend-master ~/.claude/skills/
```

放入 skill 目录后重启会话即可被索引。

## 依赖

| 组件 | 依赖 | 缺失时 |
|---|---|---|
| `audit.mjs` | 仅需 Node | — |
| `measure.mjs` | 仅需 Node | PNG 零依赖；JPEG/WebP 输入需要 `ffmpeg` 转码，没有就先用别的工具转成 PNG |
| `style_lottery.mjs` | 仅需 Node | — |
| `data.mjs` | Node + Python 3 + [`ui-ux-pro-max`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 打印降级指引，改用 `references/02` 的静态方向库 |

检索层是**增强而非前置条件**。`data.mjs` 会自动探测引擎位置与 Python 解释器，也可用环境变量覆盖：

```bash
FRONTEND_MASTER_DATA_DIR=<path to ui-ux-pro-max>
FRONTEND_MASTER_PYTHON=<python executable>
```

## 用法

```bash
# 环境自检（引擎路径 / Python 版本 / 数据规模 / 可用 domain 与 stack）
node scripts/data.mjs check

# 检索：品类适配、风格细节、色组、字对
node scripts/data.mjs "independent coffee roastery retail" --domain product -n 3
node scripts/data.mjs "b2b analytics tool dark" --domain color -n 3
node scripts/data.mjs "editorial serif body sans" --domain typography -n 3

# 技术栈专项规则
node scripts/data.mjs "list key performance" --stack react -n 5

# 完整设计系统
node scripts/data.mjs "coffee roastery" --design-system --variance 6 --motion 4 --density 5 -p "Name"

# 抽签定方向（没被点名时用；结果落盘成 STYLE.md）
node scripts/style_lottery.mjs --list
node scripts/style_lottery.mjs --write ./my-site

# 界面审计（存在 CRITICAL 时退出码为 1）
node scripts/audit.mjs ./src
node scripts/audit.mjs ./src --json

# 量渲染产物：亮度分布 / 与参考对照 / 分块查局部过曝
node scripts/measure.mjs shot.png
node scripts/measure.mjs shot.png --ref reference.png
node scripts/measure.mjs shot.png --grid
```

可用 domain（12）：`style color chart landing product ux typography icons gsap react web google-fonts`。
动效检索走 `--domain gsap`（底层读 `motion.csv`）——**没有** `motion` 这个 domain。

## 审计器覆盖什么

只做**可机械判定**的检查，宁可少报也不误报（误报会毁掉门禁的可信度）：

- **无障碍（CRITICAL）**：`<img>` 缺 `alt`、表单控件无关联 `label`、移除 `outline` 无 `:focus-visible` 替代、viewport 禁止缩放、空链接无 `aria-label`
- **真实内容（CRITICAL）**：`Lorem ipsum`、`Jane Doe`、`example.com`
- **依赖验证（CRITICAL）**：import 了未在 `package.json` 声明的包
- **AI-tells（WARN）**：全站统一圆角、重复柔和阴影、紫靛渐变、近黑 + 高饱和强调、eyebrow 形式外壳、hover 位移滥用
- **动效（WARN）**：入场用 `ease-in`、从 `scale(0)` 出现、`@keyframes` 动画布局属性、Framer Motion 的 `x`/`y` 简写（走主线程 rAF）、`scroll`/`wheel`/`touch` 监听未声明 `passive`、hover 位移无指针精度门控
- **性能（WARN）**：`transition: all`、对布局属性做过渡、图片未声明尺寸、`@font-face` 缺 `font-display`、有动效但无 `prefers-reduced-motion`

规则按文件类型分派（markup / style / script 各走各的），所以实现文件不会因为源码里写着 `<img` 而被误报。

与 `measure.mjs` 的分工：**审计器读源码，量化器读渲染结果**。前者回答"代码里写了什么不该写的"，后者回答"实际渲染出来亮到了什么程度"。暗色页面整体偏亮 2~3 倍这件事，肉眼看不出来——只能量。

构图意图、层级是否编码信息、文案是否贴合主体——这些机器判不了，走 `references/08-critique.md` 的人工协议。

## 回归基线

改过 `audit.mjs` 的规则后跑夹具：

```bash
node scripts/audit.mjs scripts/selftest/deliberately-bad.html   # 期望 CRITICAL 11 · WARN 20，退出码 1
node scripts/audit.mjs scripts/selftest/clean.html              # 期望 0 findings，退出码 0
```

干净夹具必须零告警——数值对不上就说明规则被改坏或引入了误报。

`measure.mjs` 动了 PNG 解码后，用一个**已知色值**的图对一眼均值：`#0A0E12` 的纯色图必须量出亮度 `13.4`（`0.2126×10 + 0.7152×14 + 0.0722×18`），纯白必须量出 `255`，红绿蓝三色条每通道均值必须都是 `85.0`。对不上就是解码错了，与图片本身无关。

## 维护约束

`SKILL.md` 的 YAML frontmatter 是这个 skill 能否被加载的唯一条件。**任何 markdown 格式化器都不得作用于本目录的 `.md`**：不许把行首 `---` 转义成 `\---`，不许在行尾补硬换行空格，不许对表格做对齐填充。改动后自检：

```bash
head -c 4 SKILL.md    # 必须是 --- 而不是 \---
```

## 许可证

MIT
