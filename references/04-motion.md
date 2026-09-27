# 04 · 动效

涉及任何动画、过渡、滚动效果时读。**动效不是"加上去的东西"，是预算分配问题**：一屏只花一次，花在能被看见的地方。

数据层有 17 条真实动效预设（`motion.csv`），字段为 `Intensity Tier` / `Trigger` / `Duration` / `Easing` / `GSAP Snippet` / `Framework Notes` / `Performance Notes`。三档强度与 `MOTION_INTENSITY` 旋钮一一对应。

---

## A. 三档强度

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

## B. 时长与缓动表

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

**纯 CSS 场景用对应的 `cubic-bezier`**（GSAP 的 `power1 = Quad`、`power2 = Cubic`、`power3 = Quart`）：

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

---

## C. 核心克制原则

**只保留一处编排入场 + 交互反馈。其余全部静止。**

- 编排的定义：有顺序（`stagger: 0.06–0.10s`）、有目标（把视线引到主体信息）、只发生一次（`toggleActions: 'play none none none'`，不回滚重播）。
- 无差别入场等于没有动效设计：如果每个 section 都以 `fade + translateY(20px)` 进场，用户读到第三屏就把它当背景噪声，等于零收益 + 全部成本。命中 `07` 的 C2。
- 入场位移降到 `8–16px`，让它读作"淡入"而不是"滑入"（数据层的真实 `Do`：y 偏移保持小值）。
- 交互反馈必须说明"**什么变了**"：位移 ≤ 2px 表示按压（数据层真实约束），≤ 4px + 阴影表示抬起。反馈幅度与元素的可点击性成正比——纯文本行只变底色，可点击卡才抬起。
- 每屏动效预算：1 个入场 + 每个可交互元件 1 个反馈。超出预算的动画一律删掉，而不是调快。

---

## D. 滚动驱动动效的准入门槛

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

## E. GSAP 预设检索

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

---

## F. `prefers-reduced-motion` 降级契约

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

**降级后保留**：状态反馈的最终结果（hover 的底色/描边变化仍发生，只是瞬时）、加载中的语义（静态骨架块 + "加载中"文字）、内容的完整可读性、焦点环。

**降级后去掉**：位移与缩放、透明度渐变、视差、`pin`/`scrub`、自动轮播倒计时（改为纯手动前后切换）、任何循环装饰动画。

JS 侧：入场元素**默认必须是可见的**。若用 `gsap.from(...)` 把初始态设为 `opacity: 0`，脚本失败或未加载时内容永久不可见——below-the-fold 内容不许在无 JS 回退的情况下默认隐身（数据层真实 `Don't`）。

```js
const mq = matchMedia('(prefers-reduced-motion: reduce)');
if (!mq.matches) buildAnimations();
mq.addEventListener('change', (e) => e.matches ? teardownAnimations() : buildAnimations());
```

GSAP 场景用 `gsap.matchMedia()`（数据层 `Framework Notes` 对所有 17 条预设都给了这一条），它会在媒体查询变化时自动清理与重建 tween。

---

## G. 性能：只动 `transform` / `opacity`

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
- `will-change: transform` **只加在执行动画的元素上**，动画结束移除；全站加会创建大量合成层，反而更慢（数据层 `Performance Notes`）。
- 骨架屏不用 `opacity` 脉冲，用渐变 `background-position` 扫过，读起来更像"加载中"；循环总时长压在 1.5s 以内，否则长等待会像卡死（数据层真实 `Do`）。

---

## H. 廉价动效的症状与修法

| 症状 | 为什么廉价 | 修法 |
|---|---|---|
| 每个 section 都 `fade + translateY(20px)` 入场 | 无差别出现＝没有设计决策 | 只留一处编排入场，其余静止；位移降到 8–16px |
| 每张卡 hover 都上移 4px + 加阴影 | 所有元素同一种反馈＝模板 | 反馈分档：可点击卡抬起 4px，纯文本行只变底色；按压用 ≤2px |
| 缓动一律 `ease` 或 `linear` | 机械、无物理感 | 用 B 表的 `cubic-bezier` |
| 所有动作都是 300ms | 时长与物体大小、距离无关 | 距离越大、元素越大 → 时长越长（大位移 400–800ms，小反馈 100–150ms） |
| 弹性/回弹到处用 | 无物理隐喻的回弹是噪音 | 弹性只在有释放语义时用（拖拽落位、加入收藏），每屏 ≤1 处 |
| 无限循环的装饰动画（脉冲圆点、旋转 logo） | 持续抢注意力且耗电 | 只在真实的进行中状态使用（加载、录制中），且 3 秒内可被理解 |
| 滚动劫持、连续 `pin` | 与原生滚动手感打架，移动端尤其糟 | 每页 `pin` ≤1–2 段；见 D 的准入清单 |
| 骨架屏不透明度脉冲 | 读作"闪烁"而非"加载" | 渐变扫光 + 循环 ≤1.5s；同时在 `reduced-motion` 下退为静态块 |
| 动画 `height` / `top` | 主线程掉帧，长列表直接崩 | 见 G 的替代方案 |
| 有动画但无 `reduced-motion` 处理 | 命中 `07` F 表，属于生产级缺陷 | 加 F 的媒体查询与 JS 分支 |
| 内容默认 `opacity: 0` 等 JS 唤醒 | 脚本失败即白屏 | 默认可见，动画只做"加入"而非"揭示" |

---

## 交付前检查

1. 一屏只有一处编排入场；其余元素静止或只有状态反馈。
2. 所有时长与缓动取自 B 表；没有 `ease` / `linear` 处理 UI 反馈。
3. 逐条确认没有动画 `width` / `height` / `top` / `left` / `margin`。
4. `prefers-reduced-motion: reduce` 下跑一遍：内容可读、无位移、无循环、无倒计时；入场元素仍可见。
5. GSAP 场景已 scope + 清理；生产环境关闭 `markers`；`package.json` 里确有 `gsap` 与所用插件。

```bash
node ~/.dsh/skills/frontend-master/scripts/audit.mjs ./src
```
