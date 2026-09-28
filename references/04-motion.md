# 04 · 动效

涉及任何动画、过渡、滚动效果时读。**动效不是"加上去的东西"，是预算分配问题**：一屏只花一次，花在能被看见的地方。

但在问"花在哪"之前，先回答**这里该不该动**——多数候选应该被拒绝（A 节）。本文件只管设计决策：该不该动、动多少、什么曲线。实现层（选库、GSAP 写法、ScrollTrigger、React 集成、手势、调试）见 `10-web-animation.md`。

数据层有 17 条真实动效预设（`motion.csv`），字段为 `Intensity Tier` / `Trigger` / `Duration` / `Easing` / `GSAP Snippet` / `Framework Notes` / `Performance Notes`。三档强度与 `MOTION_INTENSITY` 旋钮一一对应。

---

## A. 频率门：先决定"该不该动"

**第一道闸不是"好不好看"，是"用户一天看几次"。** 同一个动画，看一次是惊喜，看三百次是折磨。

| 频率 | 决策 |
|---|---|
| 100+ 次/天（键盘快捷键、命令面板、核心导航） | **永不动画** |
| 数十次/天（hover、列表导航、高频开关） | 移除，或只保留近乎不可察觉的反馈 |
| 偶尔（模态、抽屉、toast、设置项） | 标准动画 |
| 罕见 / 首次（引导、空态、成功、庆祝） | delight 预算花在这里 |

**键盘触发的动作是硬性取消资格，不是判断题。** 命令面板、快捷键、焦点跳转一天重复几百次，任何动画都让它读作"慢、延迟、没接上"。Raycast 的开关没有动画——这是正确答案，不是偷懒。

### A1. 合法目的只有五个

每个动画必须能报出它属于哪一个，报不出就删：

- **反馈**——确认界面听到了用户（按压缩放、按住确认的填充）
- **空间一致性**——说明东西从哪来、到哪去（toast 从同一个边进出、面板从它的触发器长出来）
- **状态指示**——让状态变化可读（按钮形变、手风琴展开）
- **防止跳跃**——内容瞬移、凭空出现或消失，需要一个过渡桥接
- **解释**——演示功能如何工作（仅限营销 / 引导）

**"这样比较酷"不在这张表里。** 判定不了的候选一律拒绝——一个到处建议加动画的核查器比没有更糟，它生产的正是本 skill 要消灭的那种拖沓界面。

---

## B. 三档强度

| Tier | M 旋钮 | 判据（可判定） | 允许的手法 | 数据层条目 |
|---|---|---|---|---|
| **Subtle** | 1–3 | 动效只在用户动作发生时出现 | 位移 ≤ 2px、透明度变化、颜色/描边过渡、视口进入时的单次 fade（y 8–16px） | 6 条 |
| **Standard** | 4–6 | 有一处编排入场 + 一组 stagger + 每个可交互元件一个反馈 | 上述全部 + `stagger` 列表 + 路由过渡（400–600ms） | 7 条 |
| **Complex** | 7–10 | 运动与滚动位置或指针位置连续绑定 | 上述全部 + `scrub` / `pin` 滚动叙事、共享元素过渡、指针跟随、弹性释放 | 4 条 |

越档判据（命中任一条即判定为选了错误的 tier）：

- 一屏内超过一组元素在同时运动（不算 stagger 内的同组）。
- 单个动作超过 800ms 而位移小于 200px——时长与距离不成比例。
- Subtle 档出现任何滚动驱动的连续动画。
- Complex 档出现无 `prefers-reduced-motion` 等价物。

---

## C. 时长与缓动

时长按"移动距离与物体大小"分档，不按喜好。下表的 Duration 与 Easing 为数据层真实取值。

| 动作 | Subtle | Standard | Complex |
|---|---|---|---|
| hover 微交互 | `150–200ms` `power1.out` | `200–300ms` `power2.out` | `300–500ms` `elastic.out(1,0.4)` |
| 滚动入场 | `300–400ms` `power1.out` | `400–600ms` `power2.out` | 绑定滚动位置，`scrub` 驱动、无固定缓动 |
| stagger 列表 | `250–350ms` `power1.out` | `300–450ms` `back.out(1.4)` | `400–700ms` `expo.out` |
| 路由 / 页面过渡 | `200–300ms` `power1.inOut` | `400–600ms` `power2.inOut` | `500–800ms` `expo.inOut` |
| 视差 | 绑定滚动，`linear` | 绑定滚动，`linear` | 绑定滚动，`linear` |
| 加载 / 骨架 | `1200–1600ms` 循环 `sine.inOut` | `800–1200ms` 循环 `power1.inOut` | — |
| 轮播 / 自动轮转 | — | 用户控制或停止，无缓动 | — |

### C1. 按组件类型的时长上限

| 元素 | 时长 |
|---|---|
| 按钮按压反馈 | `100–160ms` |
| tooltip、小 popover | `125–200ms` |
| 下拉、选择器 | `150–250ms` |
| 模态、抽屉 | `200–500ms` |
| 营销 / 解释性内容 | 可以更长 |

**铁律：UI 动画压在 300ms 以内。** 180ms 的下拉读起来就是比 400ms 的跟手。想让它"看起来高级"的冲动，几乎总是靠拉长时长实现的，而代价是每次交互都变钝。

### C2. 缓动决策树（按语义选，不按喜好）

| 场景 | 缓动 |
|---|---|
| 进入 / 退出屏幕 | `ease-out` |
| 已在屏幕上的移动 / 形变 | `ease-in-out` |
| hover、颜色变化 | `ease` |
| 恒定运动（marquee、进度条） | `linear` |
| 默认 | `ease-out` |

**UI 里永远不要用 `ease-in`。** 它起步慢，正好把用户盯着看的那一瞬间拖住。同样 200ms，`ease-out` 读起来就是比 `ease-in` 快——这是 agent 最容易搞反的一处。

### C3. 内置 CSS 缓动太弱，用强曲线

浏览器自带的 `ease` / `ease-in-out` 幅度不够，做不出该有的"利落感"。UI 用这三条：

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);      /* UI 强 ease-out，进出的默认 */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* 屏内移动的强 ease-in-out */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* iOS 风抽屉曲线（Ionic） */
```

曲线去 [easing.dev](https://easing.dev/) / [easings.co](https://easings.co/) 取现成的，不要手搓。

**纯 CSS 场景的 GSAP 等价曲线**（GSAP 的 `power1 = Quad`、`power2 = Cubic`、`power3 = Quart`）：

| GSAP easing | 等价 `cubic-bezier` |
|---|---|
| `power1.out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` |
| `power2.out` | `cubic-bezier(0.215, 0.61, 0.355, 1)` |
| `power1.inOut` | `cubic-bezier(0.455, 0.03, 0.515, 0.955)` |
| `power2.inOut` | `cubic-bezier(0.645, 0.045, 0.355, 1)` |
| `expo.out` | `cubic-bezier(0.19, 1, 0.22, 1)` |
| `expo.inOut` | `cubic-bezier(1, 0, 0, 1)` |
| `sine.inOut` | `cubic-bezier(0.445, 0.05, 0.55, 0.95)` |

`back.out(1.4)` 与 `elastic.out` **没有精确的 `cubic-bezier` 等价物**（回弹幅度是参数化的，CSS 三次贝塞尔无法表达过冲后的振荡）——要它们就必须用 GSAP，或改用 `linear()` 采样曲线。禁止用 `ease`、`ease-in-out`、`linear` 处理 UI 反馈：前者是浏览器默认的不对称曲线，后者是机械匀速。

### C4. 非对称计时

慢在用户做决定的地方，快在系统响应的地方。同一个元素的两个方向可以有完全不同的时长：

```css
.overlay { transition: clip-path 200ms ease-out; }             /* 释放：立刻响应 */
.button:active .overlay { transition: clip-path 2s linear; }   /* 按压：慢而刻意 */
```

按住确认（hold-to-confirm）是典型场景：填充要慢到让用户看清进度，回弹要快到不拖泥带水。

---

## D. 物理性：没有东西从虚无中出现

### D1. 永不用 `scale(0)`

入场从 `scale(0.9–0.97)` + `opacity: 0` 起步。**现实中没有东西从零尺寸凭空冒出来**，从 0 放大是最刺眼的生成痕迹之一。

### D2. 从触发源长出来

popover、下拉、菜单的缩放原点应在**它的触发器**上，而不是自己的中心：

```css
.popover { transform-origin: var(--transform-origin); }  /* Base UI 等提供 */
```

**模态是例外**——它出现在视口中央，保持 `transform-origin: center`。

### D3. 按压反馈的确定值

任何可按压元素：

```css
.pressable:active { transform: scale(0.97); }
.pressable { transition: transform 160ms ease-out; }
```

幅度取 `0.95–0.98`：再大就是"跳一下"，而不是"按下去"。

### D4. Spring：用物理而不是时长

弹簧动画模拟物理（张力、质量、阻尼），没有固定时长，靠参数收敛。用在**可能被中途打断的手势**上，这是它不可替代的地方——关键帧被打断会从零重启，弹簧会**带着速度**进入下一段。

```js
{ type: 'spring', duration: 0.5, bounce: 0.2 }        // Apple 风，好推理，推荐
{ type: 'spring', mass: 1, stiffness: 100, damping: 10 }  // 传统物理，控制更细
```

`bounce` 控制在 `0.1–0.3`。**多数 UI 不要回弹**，只留给拖拽关闭和玩乐型交互。

### D5. 可打断性

CSS **transition 能在半途被重定向**，**keyframes 会从零重启**。快速反复触发的元素（连续弹出的 toast、快速开关）必须用 transition，否则每次重触发都像卡了一下。

无 JS 入场用 `@starting-style`：

```css
.toast {
  opacity: 1; transform: translateY(0);
  transition: opacity 400ms ease, transform 400ms ease;
  @starting-style { opacity: 0; transform: translateY(100%); }
}
```

---

## E. 核心克制原则

**只保留一处编排入场 + 交互反馈。其余全部静止。**

- 编排的定义：有顺序（`stagger: 0.03–0.08s`）、有目标（把视线引到主体信息）、只发生一次（`toggleActions: 'play none none none'`，不回滚重播）。
- 无差别入场等于没有动效设计：如果每个 section 都以 `fade + translateY(20px)` 进场，用户读到第三屏就把它当背景噪声，等于零收益 + 全部成本。命中 `07` 的 C2。
- 入场位移降到 `8–16px`，让它读作"淡入"而不是"滑入"（数据层的真实 `Do`：y 偏移保持小值）。
- 交互反馈必须说明"**什么变了**"：位移 ≤ 2px 表示按压（数据层真实约束），≤ 4px + 阴影表示抬起。反馈幅度与元素的可点击性成正比——纯文本行只变底色，可点击卡才抬起。
- 每屏动效预算：1 个入场 + 每个可交互元件 1 个反馈。超出预算的动画一律删掉，而不是调快。
- **stagger 是装饰性的，不许挡住交互**：列表中每一项在动画播完前必须已经可点击。

---

## F. 滚动驱动动效的准入门槛

**全部满足**才允许用，缺一条即降级为普通入场：

1. 内容存在真实的空间或顺序隐喻：时间线、生产流程、数据演变、长文叙事。
2. 滚动位置与视觉状态一一映射；停止滚动后状态稳定，不继续漂移。
3. 反向滚动能看到一致的回放，不存在"单程动画"。
4. 中端移动设备上 60fps：DevTools Performance 录制期间无超过 50ms 的长任务。
5. 有 `prefers-reduced-motion` 下的静态等价物——是"内容全部直接可见"，不是空白。

**禁止**（这些条件下滚动驱动就是纯粹的装饰浪费）：

- 唯一理由是"这样看起来更高级"。
- 在正文可读区域做 `scrub`——文字随滚动位移直接损害可读性。
- 每页 `pin` 超过 1–2 段（数据层真实 `Don't`：过度 pin 会与原生滚动手感冲突并伤移动端体验）。
- 视差层超过 3 层，或 `yPercent` 位移超过 15（数据层真实 `Do`：保持 5–15，否则前后景失步）。
- 用指针/滚轮劫持覆盖原生滚动。
- 移动端默认开启——先用 `matchMedia` 判断指针精度与视口，触屏默认给静止版本。

---

## G. GSAP 预设检索

检索 domain 名为 `gsap`（数据源即 `motion.csv`），不是 `motion`；写错会被引擎拒绝。

```bash
node ~/.dsh/skills/frontend-master/scripts/data.mjs "hover micro-interaction" --domain gsap --max-results 3
node ~/.dsh/skills/frontend-master/scripts/data.mjs "scroll reveal stagger" --domain gsap --max-results 3
node ~/.dsh/skills/frontend-master/scripts/data.mjs "page transition" --domain gsap --max-results 3
```

17 条预设的真实片段（直接可用，不要凭记忆重写）：

```js
// Subtle · hover（位移 <2px，读作反馈而非运动）
gsap.to(el, { y: -1, opacity: 0.9, duration: 0.15, ease: 'power1.out' });

// Standard · 卡片 hover（必须配一个反向 tween，否则指针快速离开会卡住状态）
gsap.to(el, { y: -4, scale: 1.02, duration: 0.25, ease: 'power2.out' });

// Subtle · 滚动入场（toggleActions 用 play none none reverse 避免每次滚动方向变化都重触发）
gsap.from(el, {
  opacity: 0, y: 12, duration: 0.35, ease: 'power1.out',
  scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' }
});
```

取用时遵守：

- `ScrollTrigger` 只注册一次：`gsap.registerPlugin(ScrollTrigger)`。
- React 中包在 `useGSAP(() => {...}, { scope: containerRef })`（来自 `@gsap/react`）以获得卸载自动清理；`ScrollTrigger` 必须 scope 到 section 容器，不要让它扫描全页。
- 列表 `stagger` 子项不超过 ~8 个（真实 `Don't`：再多末尾项会显得迟滞）。
- hover 目标超过 20 个时用 `gsap.quickTo()`，避免每次事件重建 tween 造成 GC 抖动。
- 事件监听必须返回对称的移除函数（`pointermove` 这类）；`SplitText` 在清理时调用 `split.revert()` 恢复原始文本节点，否则屏幕阅读器读到被拆碎的字。
- 生产环境关掉 `markers`。
- **用前先验证依赖**：读 `package.json` 确认 `gsap` 已安装（`07` E1）。没装就明说，不要凭空 import。

GSAP 的完整能力域、插件清单与写法见 `10-web-animation.md`。

---

## H. `prefers-reduced-motion` 降级契约

CSS 侧全局兜底：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

用 `1ms` 而不是 `animation: none`：后者会让依赖 `animationend` 的逻辑永远不触发，留下卡住的加载态。

**注意方向：降级是"更少、更温和"，不是"全部归零"。** 全局 `1ms` 是兜底网，真正的做法是按元素判断——保留帮助理解状态变化的过渡（颜色、透明度），去掉位移、缩放、视差、`pin`/`scrub` 这类**空间运动**。

**降级后保留**：状态反馈的最终结果（hover 的底色/描边变化仍发生，只是瞬时）、加载中的语义（静态骨架块 + "加载中"文字）、内容的完整可读性、焦点环。

**降级后去掉**：位移与缩放、视差、`pin`/`scrub`、自动轮播倒计时（改为纯手动前后切换）、任何循环装饰动画。

```css
@media (prefers-reduced-motion: reduce) {
  .element { animation: fade 0.2s ease; }   /* 保留 opacity，去掉 transform 位移 */
}
```

**hover 运动必须同时用指针精度门控**——触屏点击会触发假的 hover：

```css
@media (hover: hover) and (pointer: fine) {
  .element:hover { transform: scale(1.05); }
}
```

JS 侧：入场元素**默认必须是可见的**。若用 `gsap.from(...)` 把初始态设为 `opacity: 0`，脚本失败或未加载时内容永久不可见——below-the-fold 内容不许在无 JS 回退的情况下默认隐身（数据层真实 `Don't`）。

```js
const mq = matchMedia('(prefers-reduced-motion: reduce)');
if (!mq.matches) buildAnimations();
mq.addEventListener('change', (e) => e.matches ? teardownAnimations() : buildAnimations());
```

GSAP 场景用 `gsap.matchMedia()`（数据层 `Framework Notes` 对所有 17 条预设都给了这一条），它会在媒体查询变化时自动清理与重建 tween。

---

## I. 性能：只动 `transform` / `opacity`

| 允许（合成器线程） | 禁止（触发布局或重绘） |
|---|---|
| `transform: translate/scale/rotate` | `width` / `height` / `top` / `left` / `right` |
| `opacity` | `margin` / `padding` / `border-width` / `font-size` |
| `filter`（谨慎，会创建新合成层） | 逐帧动画的 `box-shadow`、`background-position`（除非已在合成层内） |

原因：`width` / `height` / `top` / `left` 属于布局属性，每帧都要同步走 **Layout → Paint → Composite** 三步，主线程被阻塞，在列表或长页面上必然掉帧。`transform` 与 `opacity` 只走 Composite，可以在合成器线程上完成，主线程不参与。

具体替代：

- 位移用 `transform: translateY()`，不用 `top`。
- 展开/收起用 `grid-template-rows: 0fr → 1fr`（现代可用），不用动画 `height`。
- 缩放用 `transform: scale()`，但注意它会连带缩放子元素与 1px 描边并让文字发虚——文字必须保持清晰时改用上面的 `grid-template-rows`。
- hover 抬升不要动画 `box-shadow`：把阴影预置在一个伪元素上，用它的 `opacity` 做过渡（opacity 在合成器上，box-shadow 不在）。
- `will-change: transform` **只加在执行动画的元素上**，动画结束移除；全站加会创建大量合成层，反而更慢（数据层 `Performance Notes`）。**而且只在真的看到 1px 抖动之后再加**，不要预防性加上。
- 骨架屏不用 `opacity` 脉冲，用渐变 `background-position` 扫过，读起来更像"加载中"；循环总时长压在 1.5s 以内，否则长等待会像卡死（数据层真实 `Do`）。

### I1. 两个看不见的性能洞

- **不要用父元素的 CSS 变量去驱动子元素的 transform**——父元素一变，所有子元素样式全部重算：

  ```js
  el.style.setProperty('--swipe', `${d}px`);   // 坏：整棵子树重算样式
  el.style.transform = `translateY(${d}px)`;   // 好：只重算这一个元素
  ```

- **动画模糊要压在 20px 以内**。重模糊（尤其 Safari）极贵；动画过程中的 `blur()` 一旦上到几十 px 就开始掉帧。

---

## J. 廉价动效的症状与修法

| 症状 | 为什么廉价 | 修法 |
|---|---|---|
| 每个 section 都 `fade + translateY(20px)` 入场 | 无差别出现＝没有设计决策 | 只留一处编排入场，其余静止；位移降到 8–16px |
| 每张卡 hover 都上移 4px + 加阴影 | 所有元素同一种反馈＝模板 | 反馈分档：可点击卡抬起 4px，纯文本行只变底色；按压用 ≤2px |
| 缓动一律 `ease` 或 `linear` | 机械、无物理感 | 用 C2 的决策树与 C3 的强曲线 |
| 入场用 `ease-in` | 起步慢，正好拖住用户盯着的那一瞬间 | 进出统一 `ease-out` |
| 从 `scale(0)` 放大出现 | 现实中没有东西从虚无中出现 | 从 `scale(0.9–0.97)` + `opacity: 0` 起步 |
| popover 从自己中心缩放 | 与触发它的按钮没有空间关系 | `transform-origin` 放到触发器上；模态除外 |
| 所有动作都是 300ms | 时长与物体大小、距离无关 | 按 C1 分档（小反馈 100–160ms，模态 200–500ms） |
| 弹性/回弹到处用 | 无物理隐喻的回弹是噪音 | 只在有释放语义时用（拖拽落位、加入收藏），每屏 ≤1 处 |
| 高频开关用 keyframes | 被打断时从零重启，读作卡顿 | 改 CSS transition，半途可重定向 |
| 键盘动作（命令面板、快捷键）带动画 | 一天几百次，动画＝慢 | 直接删掉，见 A |
| 无限循环的装饰动画（脉冲圆点、旋转 logo） | 持续抢注意力且耗电 | 只在真实的进行中状态使用（加载、录制中），且 3 秒内可被理解 |
| 滚动劫持、连续 `pin` | 与原生滚动手感打架，移动端尤其糟 | 每页 `pin` ≤1–2 段；见 F 的准入清单 |
| 骨架屏不透明度脉冲 | 读作"闪烁"而非"加载" | 渐变扫光 + 循环 ≤1.5s；同时在 `reduced-motion` 下退为静态块 |
| 动画 `height` / `top` | 主线程掉帧，长列表直接崩 | 见 I 的替代方案 |
| 有动画但无 `reduced-motion` 处理 | 命中 `07` F 表，属于生产级缺陷 | 加 H 的媒体查询与 JS 分支 |
| 内容默认 `opacity: 0` 等 JS 唤醒 | 脚本失败即白屏 | 默认可见，动画只做"加入"而非"揭示" |

---

## 交付前检查

1. 每个动画都能报出 A1 的五个目的之一；报不出的已删。
2. 键盘触发的动作与 100+/天的交互没有任何动画（A）。
3. 一屏只有一处编排入场；其余元素静止或只有状态反馈。
4. 所有时长与缓动取自 C 表与 C2 决策树；没有 `ease-in` 入场，没有 `ease`/`linear` 处理 UI 反馈。
5. 没有从 `scale(0)` 出现；popover 的 `transform-origin` 在触发器上。
6. 逐条确认没有动画 `width` / `height` / `top` / `left` / `margin`。
7. `prefers-reduced-motion: reduce` 下跑一遍：内容可读、无位移、无循环、无倒计时；入场元素仍可见；hover 运动已被指针精度门控。
8. GSAP 场景已 scope + 清理；生产环境关闭 `markers`；`package.json` 里确有 `gsap` 与所用插件。

```bash
node ~/.dsh/skills/frontend-master/scripts/audit.mjs ./src
```
