# frontend-master

> 一个前端 Agent Skill：产出**不像 AI 做的前端**，而且这个判断由机器复核，不由感觉决定。

AI 写前端有两处塌陷。

**一眼 AI**——全站一个圆角值、每张卡同一个柔和阴影、每屏"居中大标题 + 三张卡"、紫靛渐变、`Lorem ipsum`。这些之所以是 tell，不在于它们丑，而在于它们**与简报无关地、无差别地出现在任何主题上**。

**不可验证**——"看起来不错"无法反驳，也没法回归。改了一版，不知道是变好了，还是只是变了。

这个 skill 对两者分别给出机制。

## 三条独立证据

三个脚本都只需 Node，都能退出非零——所以它们进得了 CI，而不只是让人看一眼。

| 脚本 | 读什么 | 回答什么 | 非零退出 |
|---|---|---|---|
| `audit.mjs` | 源码 | 代码里写了什么不该写的 | 出现 CRITICAL |
| `measure.mjs` | 渲染产物 | 实际渲染出来亮到了什么程度 | 与参考偏离 2 倍 |
| `style_lottery.mjs` | —— | 风格是不是又挑了最顺手的那个 | —— |

### measure.mjs · 把"看着有点亮"变成数字

暗色页面最常见的病是整体亮了 2~3 倍，而肉眼看不出来——显示器会骗你。零依赖，PNG 解码在 `node:zlib` 上自己实现（签名、chunk、inflate、全部五种反滤波、灰度 / 调色板 / RGB / RGBA、sub-byte 与 16-bit）：

```console
$ node scripts/measure.mjs shot.png --ref reference.png

shot.png  1440×900  RGBA 8-bit

               R       G       B     lum
mean        42.0    53.0    71.0    52.0
median        42      53      71      52

亮度分布  p05 52 · p50 52 · p95 52 · min 52 · max 52

判定：偏暗的中间调
  中位亮度 30–60：对暗色主题来说偏亮。确认这是有意为之，而不是"暗色主题"没做下去。

图内反差极小（p90 52 vs p10 52）——纯色或近似纯色的画面上，对比度指标不适用。

与参考对比：reference.png

              参考      实际       倍率
亮度 mean       22.7    52.0       2.29×  ⚠
亮度 median       23      52       2.26×  ⚠

均值偏离参考超过 2 倍。这通常不是"调色没调好"，而是管线里多做了一次
线性 → sRGB 编码（或漏了一次）。先去查编码链路，不要用调色去补。
```

上面是对两张纯色基准图运行的真实输出，可复现。`--grid` 会再给一张 3×3 分块中位亮度表，用来定位局部过曝、死黑，或者一块不该出现的亮斑。

### audit.mjs · 只报可机械判定的

宁可少报也不误报——误报会毁掉门禁的可信度。

- **无障碍 · CRITICAL**：`<img>` 缺 `alt`、表单控件无关联 `label`、移除 `outline` 却无 `:focus-visible` 替代、viewport 禁止缩放、空链接无 `aria-label`
- **真实内容 · CRITICAL**：`Lorem ipsum`、`Jane Doe`、`example.com`
- **依赖验证 · CRITICAL**：import 了未在 `package.json` 声明的包
- **AI-tells · WARN**：全站统一圆角、重复柔和阴影、紫靛渐变、近黑底配高饱和强调、eyebrow 形式外壳、hover 位移滥用
- **动效 · WARN**：入场用 `ease-in`、从 `scale(0)` 出现、`@keyframes` 动画布局属性、Framer Motion 的 `x`/`y` 简写（走主线程 rAF）、`scroll`/`wheel`/`touch` 监听未声明 `passive`、hover 位移无指针精度门控
- **性能 · WARN**：`transition: all`、对布局属性做过渡、图片未声明尺寸、`@font-face` 缺 `font-display`、有动效但无 `prefers-reduced-motion`

规则按文件类型分派（markup / style / script 各走各的），所以实现文件不会因为源码里写着 `<img` 而被误报。

它读源码，`measure.mjs` 读渲染结果。**构图意图、层级是否编码了信息、文案是否贴合主体——机器判不了**，走 `references/08-critique.md` 的人工协议。

## 方向不由你挑

交给模型自己选，它会一次又一次做出同一个页面：紫靛渐变、玻璃拟态、居中大标题加三张卡。那只是牌堆里的一张，不是这个 skill 的风格——**自选总会滑向最响的那一张**。

所以 P1 的默认动作是抽签：

```console
$ node scripts/style_lottery.mjs --list
牌堆：12 张（响度 ≤4 的安静牌 6 张）

响度  牌面                             定位
────────────────────────────────────────────────────────────────
  1   quiet-minimalism       静默极简
  2   swiss                  国际主义
  2   luxury-serif           高定
  3   editorial-broadsheet   编辑排版
  4   warm-organic           温暖有机
  4   data-dense-dashboard   数据密集
  5   technical-terminal     工程技术感
  7   playful-toy            玩趣
  8   brutalist              粗野
  8   neo-memphis            后孟菲斯
  9   retro-futurist         复古未来
 10   maximalist-collage     极繁拼贴
```

抽到哪张做哪张，`--write` 把结果落盘成项目里的 `STYLE.md`，后续改动有据可依。**牌堆里一半在响度 4 以下**——安静的方向做干净了同样成立，不要因为"这张不够炫"换牌。排掉抽签只有两种情况：用户在简报里点名了风格或给了参考片；你在改一个已有的页面。

每张牌都带一条**「最容易做坏」**，写的是它失败时的样子：

> **Swiss**：最容易犯的是"假装对齐"——元素看起来在栏上，实际靠目测留白摆的。这张牌的成败全在对齐，特效救不回来。
>
> **Quiet Minimalism**：这个方向没有装饰可以遮挡，成败全在间距与对齐精度。一旦出现三卡片、eyebrow 标签或渐变，就与默认输出无法区分。

## 两条知识层的仲裁

这个 skill 同时持有两套设计知识，它们**不是并列关系，是层级关系**。搞错层级是这份文档最容易出的错。

| 层 | 内容 | 何时用 | 权威性 |
|---|---|---|---|
| **静态层** | 12 个具名审美方向（`references/02`） | 默认走这里 | 已人工审核过抗 AI 味，是这个 skill 的立场 |
| **检索层** | BM25 引擎的 88 风格 / 192 配色 / 74 字对 / 22 技术栈 | 简报点名了具体风格、需要品类适配时 | 市场风格库，**未经抗 AI 味审核** |

冲突时：检索层返回的风格若命中黑名单（`Glassmorphism`、`Claymorphism`、`Neumorphism`、`Aurora UI`、紫靛渐变、纯黑底 + 高饱和强调色等），**不许静默采用**——要么改选静态层方向，要么写出明确的对冲措施。

这条不是纸面规定，有实证：检索层的 `--design-system` 对一个独立咖啡烘焙品牌推荐的是 `Minimalism` + trust blue/orange CTA + `Hero + Features + CTA` 三件套，正是黑名单点名的那套生成痕迹。**让检索层直接说话，产出的就是标准 AI 味页面。**

## 五阶段

```
P0 读场 → P1 定方向 → P2 落 token → P3 实现 → P4 自检
        ↑______________________________|
              不通过则回到 P1 或 P3
```

- **P0 读场**——先输出一行 `Design Read`，把隐含判断摆上台面好被推翻。简报没说的轴不许拿默认值填满，那是唯一的创作自由。
- **P1 定方向**——选一个**具名**方向，不是"现代、简洁、专业"；没被点名时由抽签决定。同时定三个旋钮 `DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY`。
- **P2 落 token**——先产出命名色、字体角色、布局概念，再写组件。
- **P3 实现**——按 `references/` 的硬规则走，不即兴。
- **P4 自检**——两条独立证据：机器审计（零容忍）+ 产物量化与截图复核（先量，再看）。

## 八源：七家融合 + 一家的三个机制

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
| `HRuiCcc/RuiC-motion-reel` | **反默认抽签制**、每张风格牌带一条「最容易做坏」、**量产物而非看感觉**（亮度对着参考量到 mean/median/p95） |

最后一家是 Python + ffmpeg 的**视频动态图形**产线，赛道与网页不同——只借上面这三个机制，不借它的引擎与实现。

这些来源都缺的一环由这个 skill 补上：**可机器验证的自检闭环**。`audit.mjs` 读源码（`motion/*` 规则让动效质量进得了门禁），`measure.mjs` 读渲染产物（让"亮了多少"成为可判定的数字）。

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
| `audit.mjs` | 仅需 Node | —— |
| `measure.mjs` | 仅需 Node | PNG 零依赖；JPEG / WebP 输入需要 `ffmpeg` 转码 |
| `style_lottery.mjs` | 仅需 Node | —— |
| `data.mjs` | Node + Python 3 + [`ui-ux-pro-max`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 打印降级指引，改用 `references/02` 的静态方向库 |

检索层是**增强而非前置条件**：没有它，静态层的 12 个方向照样工作。`data.mjs` 会自动探测引擎位置与 Python 解释器，也可以用环境变量覆盖：

```bash
FRONTEND_MASTER_DATA_DIR=<path to ui-ux-pro-max>
FRONTEND_MASTER_PYTHON=<python executable>
```

## 用法

```bash
# 环境自检：引擎路径 / Python 版本 / 数据规模 / 可用 domain 与 stack
node scripts/data.mjs check

# 抽签定方向（没被点名时用；结果落盘成 STYLE.md）
node scripts/style_lottery.mjs --list
node scripts/style_lottery.mjs --write ./my-site

# 检索：品类适配、风格细节、色组、字对
node scripts/data.mjs "independent coffee roastery retail" --domain product -n 3
node scripts/data.mjs "b2b analytics tool dark" --domain color -n 3
node scripts/data.mjs "editorial serif body sans" --domain typography -n 3

# 技术栈与专项规则
node scripts/data.mjs "list key performance" --stack react -n 5
node scripts/data.mjs "focus not obscured keyboard" --domain ux -n 3

# 完整设计系统
node scripts/data.mjs "coffee roastery" --design-system --variance 6 --motion 4 --density 5 -p "Name"

# 界面审计（存在 CRITICAL 时退出码为 1）
node scripts/audit.mjs ./src
node scripts/audit.mjs ./src --json

# 量渲染产物：亮度分布 / 与参考对照 / 分块查局部过曝
node scripts/measure.mjs shot.png
node scripts/measure.mjs shot.png --ref reference.png
node scripts/measure.mjs shot.png --grid
```

可用 domain 有 12 个：`style color chart landing product ux typography icons gsap react web google-fonts`。动效检索走 `--domain gsap`（底层读 `motion.csv`）——**没有** `motion` 这个 domain。

## 目录结构

```
SKILL.md                     主入口：流程 + 两库仲裁 + Quality Floor + AI-tells 速查
references/
  01-design-read.md          需求推断与旋钮推导
  02-aesthetic-directions.md 12 个具名方向的完整 token 配方 + 各自「最容易做坏」
  03-typography-color.md     字阶、字对、色彩 token 分层、WCAG 阈值、暗模式、cap height 居中
  04-motion.md               频率门、三档强度、缓动决策树、物理性禁令、压印、reduced-motion
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

## 回归基线

两个夹具各守一端，缺一端就不成立：

```bash
node scripts/audit.mjs scripts/selftest/deliberately-bad.html   # 期望 CRITICAL 11 · WARN 20，退出码 1
node scripts/audit.mjs scripts/selftest/clean.html              # 期望 0 findings，退出码 0
```

`deliberately-bad.html` 守**不漏报**——规则一放松，它的计数就会掉。

`clean.html` 守**不误报**——规则一收紧，它就会开始报。但它必须写得像**真人会写的规范代码**，不能是一堆"规则形状的片段"：一个只包含规则已经接受的写法的夹具，永远抓不到误报，`0 findings` 也就证明不了任何事。它现在专门收着三类最容易误报的惯用写法——标准焦点环（`:focus-visible` 里 `outline: none` + `box-shadow` 顶替）、跨多行书写的包裹式 `<label>`、以及注释里引用的反面教材。

规则跑在**剥掉注释之后**的文本上：注释是写给人看的说明，在里面引用一段坏代码是文档，不是违规。剥离按语言分派（HTML 注释 / `/* */` / `//`，其中紧跟冒号的 `//` 留给 URL），并且**要求有闭合符**——未闭合的 `/*` 不会吞掉文件剩余部分。

`measure.mjs` 动了 PNG 解码后，用**已知色值**的图对一眼均值：`#0A0E12` 的纯色图必须量出亮度 `13.44`（`0.2126×10 + 0.7152×14 + 0.0722×18`），纯白必须量出 `255`，红绿蓝三色条每通道均值必须都是 `85.0`。对不上就是解码错了，与图片本身无关。

## 维护约束

`SKILL.md` 的 YAML frontmatter 是这个 skill 能否被加载的唯一条件。**任何 markdown 格式化器都不得作用于本目录的 `.md`**：不许把行首 `---` 转义成 `\---`，不许在行尾补硬换行空格，不许对表格做对齐填充。改动后自检：

```bash
head -c 4 SKILL.md    # 必须是 --- 而不是 \---
```

改过 `references/02-aesthetic-directions.md` 里某个方向后，记得同步 `scripts/style_lottery.mjs` 的 `DECK`——牌堆是它的镜像。

## 许可证

MIT
