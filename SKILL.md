---
name: frontend-master
description: 最强前端 skill——八源融合：审美方法论与两遍法（anthropic frontend-design）+ 界面规范与性能分级（Vercel Web Interface Guidelines / React Best Practices）+ 反 AI 味黑名单与旋钮量化（taste-skill）+ 设计操作符（impeccable）+ BM25 设计智能检索层（ui-ux-pro-max：88 风格 / 192 产品配色 / 74 字对 / 119 UX 规则 / 44 React 性能规则 / 17 动效预设 / 22 技术栈）+ 网页动效实现层（GSAP 官方 skills：核心 API / 时间轴 / ScrollTrigger / 插件已全免费 / React 与框架集成）+ 动效品味标准（emilkowalski/skills：频率门 / 缓动决策树 / 时长分档 / 物理性禁令）+ 反默认抽签与量产物校准（RuiC-motion-reel：抽签定风格并落盘 STYLE.md / 截图亮度量到参考上）。任何涉及构建、重设计、评审界面与前端代码的任务都应触发：页面、落地页、仪表盘、组件、移动端 UI、HTML/CSS/JS/React/Vue/Svelte/Next.js、审美方向选择、排版配色、动效与网页动画效果（GSAP / ScrollTrigger / 滚动叙事 / 页面过渡 / 微交互 / 逐帧验证）、设计系统抽取、无障碍与性能审计、"这个页面看起来太 AI 了"。
---

# Frontend Master

一条可执行流水线，目标只有一个：**产出不像 AI 做的前端**——而且这个判断由机器复核，不由感觉决定。

## 这个 skill 融合了什么

| 来源 | 拿走的核心机制 |
|---|---|
| `anthropics/skills` → frontend-design | 设计主导者视角、两遍法（先出提案再实现）、反默认美学簇清单、"把胆量花在一处"的克制原则、文案即设计 |
| Vercel `web-interface-guidelines` | 界面规范审查以 `file:line` 输出的形式、正确性优先于品味 |
| Vercel `react-best-practices` | 按影响分级的性能规则、前缀命名与优先级表 |
| `taste-skill` | Design Read 前置、三旋钮量化、AI-tells 黑名单、依赖验证、硬 guardrails |
| `pbakaus/impeccable` | 设计操作符（polish / bolder / quieter / distill / delight）作为定向改造手段 |
| `ui-ux-pro-max` | **BM25 检索引擎**：88 风格（50 active）· 192 产品配色 · 74 官方字对 · 119 UX 规则 · 44 React 性能规则 · 17 动效预设 · 25 图表类型 · 105 图标 · 22 技术栈（1260 条规则） |
| `greensock/gsap-skills`（GSAP 官方） | 网页动效实现层：核心 API、时间轴、ScrollTrigger、插件全免费现状、React 与框架集成、性能红线 |
| `emilkowalski/skills` | 动效品味与标准：频率门（该不该动）、缓动决策树、时长分档、物理性禁令、可打断性、逐帧验证 |
| `HRuiCcc/RuiC-motion-reel` | **反默认抽签制**（引擎总做它最响的那张，所以默认是抽签而不是重复）、每张风格牌带一条「最容易做坏」、**量产物而非看感觉**（亮度 mean/median/p95 对着参考量，偏离 2× 判定管线故障） |

`RuiC-motion-reel` 是 Python + ffmpeg 的**视频动态图形**产线，赛道与网页不同——只借上面这三个机制，不借它的引擎与实现。

这些来源都缺的一环由本 skill 补上：**可机器验证的自检闭环**（`scripts/audit.mjs` 读源码 + `scripts/measure.mjs` 读渲染产物）——`motion/*` 规则与亮度量化让动效质量同样进得了门禁。

## 触发与不触发

触发：新建或重设计任何界面、写前端代码、UI 评审、设计系统抽取、性能与无障碍审计。

不触发：纯后端、纯数据处理、纯文案写作、与视觉无关的脚本。

---

## 两条知识层的分工与仲裁（本 skill 的核心规则）

本 skill 同时持有两套设计知识，它们**不是并列关系，是层级关系**。搞错层级是这份文档最容易出的错。

| 层 | 内容 | 何时用 | 权威性 |
|---|---|---|---|
| **静态层** | `references/02-aesthetic-directions.md` 的 12 个具名方向 | **默认走这里** | 已人工审核过抗 AI 味，是本 skill 的立场 |
| **检索层** | `data.mjs` 接的 88 风格 / 192 配色 / 74 字对 / 22 技术栈 | 简报点名了具体风格；需要品类适配、字对、技术栈专项规则时 | 市场风格库，覆盖面广但**未经抗 AI 味审核** |

**仲裁规则（冲突时必须执行）**：

1. 检索层返回的风格若命中 `references/07-ai-tells.md` 的黑名单——`Glassmorphism`、`Claymorphism`、`Neumorphism`、`Aurora UI`、`Soft UI Evolution`、紫色/靛蓝渐变、纯黑底 + 高饱和强调色等——**不许静默采用**。二选一：改选静态层的方向，或明确写出对冲措施（用什么真实材料/结构差异把它从"生成痕迹"拉回来）。
2. 检索层的结果**赢不了简报原话**，也赢不了静态层方向的 token 配方。它赢在"这个词我认识"——即把简报表述翻译成可执行的参数。
3. 检索命中为空时，如实说"数据库无匹配"，再退回静态层。**不许把通用默认值伪装成检索结果。**
4. 每次采用检索层结果，都要在设计提案里写明来源（哪个 domain、哪条记录），便于复核。

---

## 硬流程（五阶段，跳步即返工）

```
P0 读场 → P1 定方向 → P2 落 token → P3 实现 → P4 自检
        ↑______________________________|
              不通过则回到 P1 或 P3
```

### P0 读场：先输出 Design Read

**在写任何代码之前**，必须先输出一行 Design Read。它不是装饰，是把隐含判断摆上台面，好被推翻。

```
Design Read: <主体> · <受众> · <核心用途> · <审美方向> · DIALS V<n> M<n> D<n>
```

- 用户给的每一个视觉线索都优先于你的默认倾向；简报里的原话永远赢，**包括它点名要一个"陈词滥调"风格时**。
- 简报没说的轴，不许拿默认值填满——那是唯一的创作自由。
- 简报没给主体，自己定一个具体主体（含受众与用途）作为提案，不要问三个问题。歧义只需一个问题。

详见 `references/01-design-read.md`。

**首次使用可做一次环境自检**（确认检索层在线）：

```bash
node ~/.dsh/skills/frontend-master/scripts/data.mjs check
```

它会报出引擎路径、Python 版本、数据规模与可用的 domain / stack 清单。检索层不可用时它会给出降级指引——**检索层是增强，不是前置条件**，没有它照样按静态层工作。

### P1 定方向：选一个具名审美方向，不是形容词

禁止方向写成"现代、简洁、专业"。从 `references/02-aesthetic-directions.md` 里选一个**具名方向**（Editorial Broadsheet / Swiss / Brutalist / Terminal / Luxury Serif / Warm Organic / Retro-Futurist / Maximalist Collage / Quiet Minimalism / Data-Dense Dashboard / Playful Toy / Neo-Memphis），并采用它的 token 配方。

**没被点名时，方向由抽签决定，不由你挑**：

```bash
node ~/.dsh/skills/frontend-master/scripts/style_lottery.mjs --list          # 看整副牌
node ~/.dsh/skills/frontend-master/scripts/style_lottery.mjs --write .       # 抽一张，落盘成 STYLE.md
```

留给你自己挑，你会一次又一次做出同一个页面——紫靛渐变、玻璃拟态、居中大标题加三张卡。那只是 12 张牌里的**一张**，不是本 skill 的风格。**牌堆里有一半在响度 4 以下**，安静的方向做干净了同样成立，不要因为"这张不够炫"换牌。抽签结果写进项目的 `STYLE.md`，后续改动有据可依。

排掉抽签只有两种情况：**用户在简报里点名了风格或给了参考片**（那就用它，简报原话永远赢）；**你在改一个已有的页面**（顺着它现有的方向走，不要换掉它的骨架）。

方向来自以上两种情况之一时，仍要做**反默认自查**：这个方向是不是我不看简报也会选的？是就换。

**简报点名了某种具体风格、或你不确定这个品类该长什么样时**，先查检索层再定：

```bash
# 品类适配：这个产品类型通常配什么风格
node ~/.dsh/skills/frontend-master/scripts/data.mjs "independent coffee roastery retail" --domain product -n 3
# 风格细节：色板、效果、无障碍风险、实现清单
node ~/.dsh/skills/frontend-master/scripts/data.mjs "editorial print magazine dense" --domain style -n 3
```

命中黑名单的风格按上面的仲裁规则处理。**检索层给的是市场惯例，静态层给的是本 skill 的立场——两者冲突时默认信静态层。**

三个旋钮同时确定：

| 旋钮 | 1–10 含义 | 低（1-3） | 中（4-6） | 高（7-10） |
|---|---|---|---|---|
| `DESIGN_VARIANCE` | 布局冒险度 | 单栏、严格网格 | 非对称、跨栏 | 破格、叠压、旋转、非常规滚动 |
| `MOTION_INTENSITY` | 动效强度 | 仅状态反馈 | 一处编排入场 + 交互反馈 | 滚动驱动、连续物理 |
| `VISUAL_DENSITY` | 信息密度 | 大留白、少数据 | 平衡 | 密集、表格化、监控台 |

### P2 落 token：先写系统再写界面

必须先产出紧凑 token 系统，再动手写组件：

1. **Color**：4–6 个命名 hex（`--ink` / `--paper` / `--accent` / `--muted` / `--line`），说明各自的职责，不许只给一个主色。
2. **Type**：字体族 + 角色分配（最多两族；两族必须清晰可分）+ 字阶。
3. **Layout**：一句话概念 + ASCII 线框对比两个方案 + 对齐策略（左/中/两端）。
4. **Principles**：这个页面靠什么被记住，一条就够。

**需要真实色组或字对时走检索层**（不要凭记忆编字体组合）：

```bash
# 192 套产品配色：含 Primary / On Primary / Background / Foreground / Card / Muted / Border / Destructive / Ring 完整角色
node ~/.dsh/skills/frontend-master/scripts/data.mjs "b2b analytics tool dark" --domain color -n 3
# 74 组官方字对：含 Google Fonts URL、CSS import、Tailwind config
node ~/.dsh/skills/frontend-master/scripts/data.mjs "editorial serif body sans" --domain typography -n 3
```

取到的色组与字对**要过一遍静态层的审美与黑名单**再采用。判据见 `references/03-typography-color.md`。

### P3 实现：遵守硬规则，别即兴

- 排版与色彩 → `references/03-typography-color.md`
- 动效 → `references/04-motion.md`
- 布局与架构 → `references/05-layout-architecture.md`
- 工程、性能、无障碍、依赖 → `references/06-engineering.md`
- 文案 → `references/09-copy.md`
- 动效实现（选库、GSAP、滚动效果、手势）→ `references/10-web-animation.md`
- 明确禁止的写法 → `references/07-ai-tells.md`（**写码前必读**）

技术栈专项规则按探测到的栈检索（22 个栈，共 1260 条）：

```bash
node ~/.dsh/skills/frontend-master/scripts/data.mjs "list key performance" --stack react -n 5
node ~/.dsh/skills/frontend-master/scripts/data.mjs "image optimization layout shift" --stack nextjs -n 3
```

UX 与 React 性能规则同样可查：

```bash
node ~/.dsh/skills/frontend-master/scripts/data.mjs "focus not obscured keyboard" --domain ux -n 3
node ~/.dsh/skills/frontend-master/scripts/data.mjs "avoid rerender memo" --domain react -n 3
```

### P4 自检：两条独立证据

1. **机器审计**（必做，零容忍）：

```bash
node ~/.dsh/skills/frontend-master/scripts/audit.mjs <目录或文件...>
```

命中 `CRITICAL` 必须修完再交付；`WARN` 要么修，要么在交付说明里给出保留理由。退出码非 0 表示存在 `CRITICAL`。加 `--json` 可拿到结构化结果。

审计器只做**可机械判定**的检查（缺失 alt、无 label、禁用缩放、占位内容、统一圆角、重复阴影、`transition: all`、未声明依赖等）。构图意图、层级是否编码信息、文案是否贴合主体——这些机器判不了，走第 2 条。

2. **视觉复核**（有渲染环境时必做）：截图 → **先量，再看** → 落到 `file:line`。协议见 `references/08-critique.md`。

```bash
node ~/.dsh/skills/frontend-master/scripts/measure.mjs shot.png                 # 亮度分布与判定
node ~/.dsh/skills/frontend-master/scripts/measure.mjs shot.png --ref ref.png   # 与参考片/设计稿对照
node ~/.dsh/skills/frontend-master/scripts/measure.mjs shot.png --grid          # 3×3 分块，查局部过曝或死黑
```

暗色页面最常见的病是**整体亮了 2~3 倍**，而肉眼看不出来——显示器会骗你，数字不会。判据：暗场的中位亮度应落在 `5–30`；中位或均值偏离参考超过 2 倍即退出非零，这通常不是"颜色没调好"，而是管线里多做了一次线性 → sRGB 编码，**去查编码链路，不要用调色去补**。

## Quality Floor（不可协商，任何风格都不许跌破）

1. 375px 起移动端可用，无横向滚动。
2. 键盘焦点可见（`:focus-visible`），焦点顺序合乎阅读顺序。
3. `prefers-reduced-motion` 生效：动效降级为不影响可用性的形式。
4. 正文对比度 ≥ 4.5:1，大字 ≥ 3:1；不靠颜色单独传达状态。
5. 交互目标 ≥ 44×44px（触控）。
6. 语义化标签 + 可访问名称；图片有 `alt`；表单有 `label`。
7. 消费级页面必须亮暗两模式都测过；暗模式不是把颜色反转。
8. CLS < 0.1，无布局跳动（固定图片尺寸、字体 `font-display: swap` 且预留度量）。
9. 不使用未安装、不存在的依赖；每个 import 都要能验证（`audit.mjs` 会直接扫出来）。
10. 空态、加载态、错误态都有实际设计，不是空白或转圈。
11. 真实内容或可信的拟真内容，绝不 Lorem ipsum / Jane Doe / Acme / example.com。

## AI-tells 速查（高频十二条）

出现即视为缺陷，替代做法见 `references/07-ai-tells.md`。

| # | 特征 | 为什么是 tell |
|---|---|---|
| 1 | 全站统一一个 `border-radius`，卡片、按钮、输入框都一样 | 层级信息被抹平，是模板的特征 |
| 2 | 每张卡都是同一个柔和阴影 `rgba(0,0,0,.1)` | 说明阴影是装饰而非光照逻辑 |
| 3 | 每个标题上方加一个全大写、大字号间距的 eyebrow 小标签 | 与内容无关的形式外壳 |
| 4 | 标题里单独一个词变色/斜体/加粗 | 最常见的生成痕迹 |
| 5 | 每个 section 都是"居中大标题 + 副标题 + 三张卡" | 结构没在编码信息 |
| 6 | 每段 fade-and-slide-up 入场、每卡都 hover 位移 | 无差别动效 = 没有动效设计 |
| 7 | `01 / 02 / 03` 编号，但内容并非序列 | 数字成了装饰 |
| 8 | `#0B0B0B` 假装纯黑 + 一个高饱和强调色（酸绿/朱红） | 已成簇出现的默认配方 |
| 9 | 渐变作为背景装饰，不承载意义 | 洗色代替设计 |
| 10 | `A · B · C` 中点拼接、`WORD — fragment` 间隔号、按钮文案 `Submit` | 模板文案语法 |
| 11 | 中英混杂的假数据、`example.com`、头像占位 | 内容也是设计的一部分 |
| 12 | UI 里出现 emoji 当图标 | 图标应来自统一图标集 |

其中 1、2、6、8、9、10、11、12 会被 `audit.mjs` 直接或间接扫出来。

## 设计操作符（改造既有界面时）

不要笼统地说"再好看点"，用操作符定向推动，一次一个：

| 操作符 | 作用 | 典型命令 |
|---|---|---|
| `critique` | 先诊断，输出 `file:line` 级问题清单 | 评审这个组件 |
| `polish` | 收尾：间距节奏、字距、边缘对齐 | 抛光这一屏 |
| `distill` | 去噪，只留必要元素 | 精简到只剩三样东西 |
| `quieter` | 降噪，做平静聚焦的界面 | 让它安静下来 |
| `bolder` | 增强视觉重量与存在感 | 让它更有分量 |
| `delight` | 加微观交互与手感 | 补一处有意义的反馈 |

判定标准与触发条件见 `references/08-critique.md`。

## 参考文件索引（按需读取，不要全读）

| 文件 | 何时读 |
|---|---|
| `references/01-design-read.md` | P0 阶段，做需求推断与旋钮推导 |
| `references/02-aesthetic-directions.md` | P1 阶段，选方向、取 token 配方；12 个方向各带一条「最容易做坏」 |
| `references/03-typography-color.md` | P2/P3，排版与色彩系统 |
| `references/04-motion.md` | 涉及任何动画、过渡、滚动 |
| `references/05-layout-architecture.md` | 布局、栅格、间距、层叠 |
| `references/06-engineering.md` | 写 React/Vue/Next.js 或关注性能、无障碍 |
| `references/07-ai-tells.md` | **写码前必读**；以及被说"太 AI 了"时 |
| `references/08-critique.md` | P4 自检、评审他人界面 |
| `references/09-copy.md` | 界面文案、按钮、错误与空态 |
| `references/10-web-animation.md` | 写任何动画效果、滚动动效、页面过渡、GSAP 代码时 |

## 脚本索引

| 脚本 | 用途 | 依赖 |
|---|---|---|
| `scripts/audit.mjs` | P4 机器审计，`file:line` + CRITICAL/WARN，非零退出即未通过；含 `motion/*` 动效规则 | 仅需 Node |
| `scripts/style_lottery.mjs` | P1 抽签定方向：12 张牌带响度标注，`--write` 落盘 `STYLE.md`；`--list` / `--seed` / `--avoid` / `--json` | 仅需 Node |
| `scripts/measure.mjs` | P4 量产物：截图亮度 mean/median/p05/p95 + 3×3 分块 + `--ref` 对照（偏离 2× 退出非零）；零依赖 PNG 解码 | 仅需 Node（JPEG 可选走 ffmpeg） |
| `scripts/data.mjs` | 检索层桥接（转发到 BM25 引擎），`check` 子命令做环境自检 | Node + Python 3 + ui-ux-pro-max |
| `scripts/selftest/` | 两个夹具：`deliberately-bad.html` 必须被抓满，`clean.html` 必须零告警 | 仅需 Node |

改过 `audit.mjs` 的规则后，用夹具回归一次：

```bash
node ~/.dsh/skills/frontend-master/scripts/audit.mjs scripts/selftest/deliberately-bad.html   # 期望：CRITICAL 11 · WARN 20
node ~/.dsh/skills/frontend-master/scripts/audit.mjs scripts/selftest/clean.html              # 期望：0 findings
```

## 常见失败模式

| 症状 | 根因 | 修法 |
|---|---|---|
| 页面能跑但一眼 AI | 跳了 P0/P1，直接写码 | 回 P1 换成具名方向，重写 token |
| 风格不统一 | 没有 token，边写边决定颜色 | 回 P2，先定 4–6 个命名色 |
| 哪里都"挺好看"但记不住 | 把胆量平均分配了 | 砍掉一半装饰，把一处做大 |
| 动效廉价 | 无差别入场动画 | 只保留一处编排 + 交互反馈 |
| 评审意见空泛 | 没看渲染结果 | 截图后再评，落到 `file:line` |
| 越改越乱 | 一次动多个变量 | 一次一个操作符，改完截图复核 |
| 用了不存在的库/API | 没做依赖验证 | `audit.mjs` 的 `eng/unverified-dep` 会抓；写码前先查 `package.json` |
| 检索层查不到就硬编 | 没走仲裁规则第 3 条 | 如实说无匹配，退回静态层的具名方向 |
| 挑不出毛病，但很眼熟 | 方向是自己挑的，且挑到了最顺手的那个 | 跑 `style_lottery.mjs` 重抽，抽到哪张做哪张 |
| 暗色页面偏亮或发灰 | 只靠肉眼判断，从没量过 | `measure.mjs` 量中位亮度，与参考对照后再改 |

## 文件维护约束（防止自动化改动破坏本 skill）

本文件的 YAML frontmatter 是 skill 能否被加载的唯一条件。**任何 markdown 格式化器都不得作用于 `SKILL.md` 及 `references/*.md`**：

- 不许把行首的 `---` 转义成 `\---`，也不许在行尾补 Markdown 硬换行空格。
- 不许对表格做对齐填充（保持 `|---|---|` 紧凑形式），填充会虚增行宽并污染 diff。
- 正文里的 `---` 分隔线、YAML frontmatter 定界符必须保持原样。

改了 `references/02-aesthetic-directions.md` 里某个方向的定位、色板、字体或「最容易做坏」时，**同步更新 `scripts/style_lottery.mjs` 的 `DECK`**——牌堆是它的镜像，两处不一致会让抽出来的风格与配方对不上。

改过 `scripts/audit.mjs` 或 `scripts/measure.mjs` 后，用夹具与基准图各回归一次（`measure.mjs` 有没有解错 PNG，用一个已知色的图对一眼均值即可）。

改过本目录任何 `.md` 后，用以下命令验证 frontmatter 未被破坏：

```bash
head -c 4 SKILL.md    # 必须输出 --- 而不是 \---
```
