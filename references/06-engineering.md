# 06 · 工程、性能与无障碍

P3/P4 阶段使用。风格可以争论，这一章不行——这里每条都是**可机器判定**的：能跑出数值、能查出条目、能在 DevTools 里读出来。

规则来源：`react-performance.csv`（44 条，分类分布 JS Perf 12 · Rerender 7 · Rendering 6 · Async Waterfall 5 · Bundle Size 5 · Server 5 · Advanced 2 · Client 2）、`ux-guidelines.csv`（119 条）、`app-interface.csv`（32 条）、`stacks/*.csv`（22 栈共 1260 条）。检索命令见 F 节。

---
## A. React 性能：按影响分级的关键规则

| 影响 | 分类 | 规则 | Do | Don't |
|---|---|---|---|---|
| 必改 | Async Waterfall | Promise.all Parallel | 独立操作 `Promise.all()` 并发 | 顺序 `await` 制造瀑布 |
| 必改 | Async Waterfall | Defer Await | `await` 移进真正用到它的分支 | 函数顶部 `await` 阻塞全部分支 |
| 必改 | Async Waterfall | API Route Optimization | 早启动、晚 `await`（先存 promise） | 处理器里逐个顺序 `await` |
| 必改 | Bundle Size | Barrel Imports | 直接指向源文件路径 | 从 barrel / index 导入 |
| 必改 | Bundle Size | Dynamic Imports | `dynamic(() => import(...), { ssr: false })` | 顶层导入重组件 |
| 必改 | Server | Parallel Fetching | 组件组合让 RSC 并行取数 | 父组件顺序 `await` 后传给子组件 |
| 高 | Async Waterfall | Suspense Boundaries | 异步组件包 `Suspense` + 骨架 | 等数据阻塞整页渲染 |
| 高 | Bundle Size | Conditional Loading | 特性激活时才 `import()` | 无条件导入大模块 |
| 高 | Server | LRU Cache Cross-Request | 跨请求共享数据用 LRU（`max` + `ttl`） | 每个请求都回源 |
| 高 | Server | Minimize Serialization | 只传客户端真正用到的字段 | 把整个对象过 RSC 边界 |
| 高 | Rendering | Content Visibility | 长列表 `content-visibility: auto` + `contain-intrinsic-size` | 一次性直接渲染千行 |
| 中高 | Client | SWR Deduplication | `useSWR` 自动去重与缓存 | `useEffect` 里手写 `fetch` |
| 中高 | JS Perf | Length Check First | 先比长度再比内容 | 长度不同也跑昂贵比较 |
| 中高 | JS Perf | toSorted Immutable | `toSorted()` 保持不可变 | `sort()` 原地修改 |
| 中 | Rerender | Functional setState | `setState(curr => …)` | 直接引用闭包里的 state |
| 中 | Rerender | Derived State | 订阅派生布尔值（`isMobile`） | 订阅连续值（`width`）再派生 |
| 中 | Rerender | Lazy State Init | `useState(() => buildIndex(items))` | `useState(buildIndex(items))` 每次渲染都算 |
| 中 | Rerender | Memoized Components | 昂贵子树抽成 `memo()` 组件，放在 early return 之后 | 在 early return 之前算昂贵值 |
| 中 | Rerender | Transitions | 高频非紧急更新用 `startTransition` | 每次滚动都同步阻塞渲染 |
| 中 | Rerender | Narrow Dependencies | `[user.id]` 用原始值作依赖 | `[user]` 对象引用作依赖 |
| 中 | Server | `cache()` Dedup | 取数函数包 `cache()` | 同一请求内重复取同一份数据 |
| 中 | Server | After Non-blocking | 日志 / 埋点放 Next.js `after()` | 为埋点阻塞响应 |
| 中 | Rendering | Hydration No Flicker | 内联同步脚本先设客户端专属值（如主题） | `useEffect` 里设，先闪一下 |
| 中 | Rendering | Conditional Render | 计数可能为 `0` 时用三元 | `{count && <Badge/>}` 渲染出 `0` |
| 中 | Advanced | Effect Events | `useEffectEvent` 只用于 Effect 内的非响应式逻辑，真依赖照留 | 用它隐藏依赖，或在渲染期 / 普通事件处理器里调用 |

```js
// ✅ const [u, p] = await Promise.all([fetchUser(), fetchPosts()]);
// ❌ const u = await fetchUser(); const p = await fetchPosts();
// ✅ import Check from 'lucide-react/dist/esm/icons/check';
// ❌ import { Check } from 'lucide-react';
// ✅ users.toSorted((a, b) => a.name.localeCompare(b.name));
// ❌ users.sort((a, b) => a.name.localeCompare(b.name));
```

`useEffectEvent` 与 `<Activity>` 属 React 19.2+ 路径，版本低于此改用 ref 模式与条件渲染。`LRUCache`、`after()`、`useSWRSubscription`、`better-all` 都必须先过 B 节验证。

---
## B. 依赖验证（硬规则）

**每个 `import` 都必须能验证存在。** 凭记忆写 import 是本 skill 判定的一级缺陷（`07-ai-tells.md` E1、E2）。

| 检查项 | 命令 | 通过标准 |
|---|---|---|
| 声明存在 | `rg '"<pkg>"' package.json` | 命中 dependencies / devDependencies / peerDependencies |
| 已安装 | `Test-Path node_modules/<pkg>/package.json`；`npm ls <pkg>` | 存在；`npm ls` 不报 `UNMET` |
| 锁文件 | `rg 'node_modules/<pkg>"' pnpm-lock.yaml`、`package-lock.json`、`yarn.lock` | 有精确条目 |
| 子路径存在 | 直接查目标文件，如 `lucide-react/dist/esm/icons/check.js` | 文件真实存在，不是猜的路径 |
| 版本下限 | `npm view <pkg> version` | 不低于规则要求的下限 |
| 框架下限 | RSC 代码路径 | `react@19.2.1+`：19.2.0 存在未授权 RCE，19.2.1 是安全底线 |

```bash
rg '"framer-motion"' package.json
Test-Path node_modules/framer-motion/package.json
npm view react version
```

禁止项：未安装却 `import`；往 `package.json` 手写依赖但不安装；引用不存在的组件路径；猜 barrel 路径（如 `@/components`）。确实需要新依赖时，在交付说明里**显式列出包名、版本、用途与安装命令**，再使用。

---
## C. 无障碍：条款与判定标准

| 条款 | 等级 | 判定标准 | 实现 |
|---|---|---|---|
| 1.1.1 Non-text Content | A | 有意义图片有等价文本 | `<img alt="…">`；纯装饰 `alt=""` + `aria-hidden="true"` |
| 1.3.1 Info and Relationships | A | 结构用语义标签，不靠视觉模拟 | `<nav>/<main>/<section>`；标题 `h1→h6` 不跳级 |
| 1.4.3 Contrast (Minimum) | AA | 正文 ≥ 4.5:1；≥24px 或 ≥18.66px 粗体 ≥ 3:1 | 在真实背景上测，不测白底理论值 |
| 1.4.4 Resize Text | AA | 放大 200% 不丢内容、不丢功能 | 用 `rem` 定字号，不用 `px` |
| 1.4.10 Reflow | AA | 320 CSS px 宽无需双向滚动 | 见 `05-layout-architecture.md` D 节 |
| 1.4.11 Non-text Contrast | AA | 控件边界、图标、状态指示 ≥ 3:1 | 输入框描边也要测 |
| 1.4.12 Text Spacing | AA | 行高 1.5、段距 2em 等覆盖后不截断 | 用无单位行高与内容驱动高度 |
| 2.4.1 / 2.4.3 Bypass Blocks / Focus Order | A | 有跳到主内容链接；Tab 顺序与视觉顺序一致 | 跳过链接为首个可聚焦元素；不用正数 `tabindex` 改序 |
| 2.4.7 Focus Visible | AA | 每个可操作控件有清晰焦点指示 | `:focus-visible`；不用 `outline: none` 而无替代 |
| 2.4.11 Focus Not Obscured | AA | 焦点目标不被作者内容完全遮挡 | 滚动容器 `scroll-padding-top: var(--header-h)` |
| 2.5.8 Target Size (Minimum) | AA | ≥ 24×24 CSS px，或间距等价 | 见下方三档表 |
| 3.3.2 / 4.1.2 Label 与可访问名称 | A | 每个输入有可见 `label`；图标按钮有名称 | `<label for>` 或包裹式，不用 `placeholder` 顶替；`<button aria-label="关闭">` |

```css
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

**触控目标三档**（别把三者混为一谈）：

| 层 | 阈值 | 适用 |
|---|---|---|
| WCAG 2.2 SC 2.5.8 (AA) | 24×24 CSS px，或满足间距等价 | 桌面密集界面下限 |
| 本 skill Quality Floor | 44×44 px | 触控场景硬线 |
| iOS / Android 原生 | 44pt / 48dp | 移动端与原生 |
| 相邻目标间距 | 相邻触控目标间 ≥ 8px | 所有触控布局 |

用 `padding` 扩大热区，不放大图标本身。表单错误三重编码：边框 + 图标 + 就近文字，并用 `aria-describedby` 关联字段；错误容器用 `role="alert"` 或 `aria-live`。

---
## D. CLS < 0.1

CLS 只统计**非用户输入导致**的位移。五条手段覆盖绝大多数成因：

| 手段 | 写法 / 判定 |
|---|---|
| 图片预留尺寸 | `<img width="1440" height="810">`，浏览器据此算 `aspect-ratio`；或 CSS `aspect-ratio: 16/9` |
| 骨架尺寸 = 成品尺寸 | `<Skeleton className="h-48" />` 与最终内容同高，不许「先小后大」 |
| 字体度量对齐 | `font-display: swap` + `@font-face` 的 `size-adjust` / `ascent-override`；Next.js 用 `next/font` 自动算 fallback 度量 |
| 动态注入内容 | banner、徽标、校验文案、广告位、异步态全部预留固定高度，或放进尺寸稳定的内容驱动容器 |
| `content-visibility` | 必须配 `contain-intrinsic-size`，否则滚动条与位置跳动 |

```js
new PerformanceObserver((l) => {
  let cls = 0;
  for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value;
  if (cls >= 0.1) console.warn('CLS 超限', cls.toFixed(3));
}).observe({ type: 'layout-shift', buffered: true });
```

---
## E. 图片与字体加载

| 决策 | 做法 |
|---|---|
| 格式 | AVIF → WebP → JPEG/PNG 兜底（`<picture>`）；图标与 logo 用 SVG；不用 GIF |
| 尺寸与 `sizes` | `srcset` 用 `w` 描述符覆盖 1× 与 2×；`sizes` 必须描述真实渲染宽度，写错会选错候选图 |
| 首屏 LCP 图 | 不懒加载，`fetchpriority="high"`；Next.js 用 `priority` |
| 折叠以下图片 | `loading="lazy" decoding="async"` |
| 字体格式与加载 | 只发 `woff2`，可变字体单文件覆盖多字重；`preload` 只给首屏 1–2 个字面；`font-display: swap`；按 `unicode-range` 切子集 |
| 第三方脚本 | `async` / `defer`，不阻塞渲染；关键 CSS 内联，其余延后 |

```html
<img src="hero-960.avif"
     srcset="hero-480.avif 480w, hero-960.avif 960w, hero-1440.avif 1440w"
     sizes="(min-width: 1024px) 50vw, 100vw"
     width="1440" height="810" alt="…" fetchpriority="high" decoding="async">
<link rel="preload" as="font" type="font/woff2" href="/fonts/display.woff2" crossorigin>
```

---
## F. 技术栈与数据层检索

数据层桥接脚本。引擎不可用时退回 `02-aesthetic-directions.md` 的静态方向配方——检索层是增强，不是前置。

```bash
node ~/.dsh/skills/frontend-master/scripts/data.mjs domains      # 自检 + 列出全部 domain 与 stack
node ~/.dsh/skills/frontend-master/scripts/data.mjs "<query>" --domain ux --max-results 3
node ~/.dsh/skills/frontend-master/scripts/data.mjs "<query>" --stack nextjs --max-results 3
node ~/.dsh/skills/frontend-master/scripts/data.mjs "<product>" --design-system --variance 7 --motion 6 --density 5 -p "<Name>"
```

| 检索对象 | domain | 规模 | 典型查询词 |
|---|---|---|---|
| React 性能规则 | `react` | 44 条 | `await waterfall`、`rerender dependencies` |
| 界面规范（跨端） | `web` | 32 条 | `focus visible overflow`、`keyboard type` |
| UX / 无障碍规则 | `ux` | 119 条 | `touch target contrast`、`form label error` |
| 风格 / 配色 / 字对 / 落地页模式 | `style` `color` `typography` `landing` | 88 / 192 / 74 / — | 见下列 domain 全表 |

可用 `--domain`（12）：`style color chart landing product ux typography icons gsap react web google-fonts`（`gsap` 即动效预设 17 条）。
可用 `--stack`（22）：`react nextjs vue svelte astro swiftui react-native flutter nuxtjs nuxt-ui html-tailwind shadcn jetpack-compose threejs angular laravel javafx wpf winui avalonia uno uwp`，合计 1260 条。

检索是关键词匹配：命中 0 条时会给出 `Closest known terms`，**用它作为关键词重试**，不空手退回通用默认值。加 `--json` 取结构化输出，加 `--full` 禁止截断长字段（代码示例默认不截断）。

---
## G. 交付前工程自检清单

| # | 检查项 | 通过标准 |
|---|---|---|
| 1 | 无横向滚动 | 320px 与 375px 下 `document.documentElement.scrollWidth` ≤ 视口宽 |
| 2 | 依赖可验证且无 barrel 导入 | 每个 `import` 过 B 节六项检查；全仓搜 `from "@/components"` 除外无命中 |
| 3 | 焦点可见 | 逐个 Tab 走完页面，每个可操作控件都有可见焦点环，且不被粘性头遮挡 |
| 4 | 可访问名称与对比度 | 图片有 `alt`（装饰图为空 alt）；图标按钮有 `aria-label`；表单控件有关联 `label`；正文 ≥ 4.5:1，大字与控件边界 ≥ 3:1，亮暗两模式都测 |
| 5 | 触控目标 | 触控场景 ≥ 44×44px；相邻目标间距 ≥ 8px |
| 6 | CLS 与首屏图片 | 实测 < 0.1；LCP 图不懒加载且有 `fetchpriority="high"`；折叠下图片 `loading="lazy"` |
| 7 | 三种状态 | 空态、加载态、错误态都有实际设计，不是空白或裸转圈 |
| 8 | 长内容韧性 | 长标题、长 URL、长用户名、超长数字逐一替换后布局不破 |
| 9 | 动效降级 | `prefers-reduced-motion: reduce` 下动效降级且不影响可用性 |
| 10 | 真实内容 | 无 Lorem ipsum / Jane Doe / Acme / example.com / `$1,234.56` |
| 11 | 机器审计 | `node ~/.dsh/skills/frontend-master/scripts/audit.mjs <路径>` 无 CRITICAL |
