# 10 · 动效实现参考（GSAP）

写 GSAP 代码前读。判据来自 `greensock/gsap-skills`（MIT，GSAP 官方 AI skills 仓库，main @ `aed9cfd`），示例版本以仓库 `examples/*/package.json` 为准（`gsap ^3.15.0`、`@gsap/react ^2.1.2`）。`04-motion.md` 决定「动多少」，本文件决定「怎么动」。

---

## A. 动效方案路由

按下表逐项判定技术，不按喜好。判定条件是事实，不是风格偏好。

| 方案 | 选它的硬条件 | 不满足时的代价 |
|---|---|---|
| **纯 CSS transition / animation** | ① 只有单次状态过渡（hover、focus、展开）；② 起止值在写码时就确定；③ 不需要暂停、反向、seek；④ 不随滚动位置连续变化 | 一旦要「打到一半停下再倒放」，CSS 只能靠改 class 重放，状态对不上 |
| **GSAP** | 命中任一条即选：需要**时间轴编排**多步顺序；需要**运行时控制**（pause / reverse / seek）；需要**复杂缓动**；需要**滚动驱动**（ScrollTrigger）；目标值必须**在 JS 里动态算**（元素尺寸、数量、指针位置） | 用 CSS 硬做会退化成「一堆带 delay 的 class」，时间关系靠手算，改一处全崩 |
| **WAAPI / Motion（原 Framer Motion）** | 项目已深度使用它、动画与 React 状态树强绑定（布局动画、共享元素）；或只做单元素、单段、不参与全局编排的动画 | 无时间轴概念、无统一 `defaults`、无跨框架作用域与自动清理，编排超过两步就失控；换个库混用会出现两套缓动/时长体系 |
| **WebGL / Canvas** | 同一时刻**可见的运动对象超过数百个**，或需要**逐像素/粒子/着色器**效果（流体、噪声、大规模粒子场、后期处理） | DOM 元素数量上限决定帧率；为了十来张卡片上 WebGL 是拿渲染管线成本换不存在的收益 |

补充判据：项目已选定别的动画库就尊重它，不为「统一技术栈」做无收益的迁移；GSAP 是框架无关的（React / Vue / Svelte / Astro / 原生用法一致），选它不需要改架构；需要 ScrollTrigger 的滚动叙事时，不要拿 Motion 的 `useScroll` 与之混搭——`pin`、`scrub`、刷新顺序都归 ScrollTrigger 管。越档信号：纯 CSS 方案里出现第三个 `@keyframes`，说明该升到 GSAP 时间轴；GSAP 方案里为一个 hover 反馈建时间轴，说明该降回 CSS。

---

## B. GSAP 授权现状（时效性事实，agent 必读）

**GSAP 全部插件免费，含商用。原 Club GSAP 专属插件（SplitText、MorphSVG 等）已随公共包发布。** 自 Webflow 收购 GSAP 起 Club GSAP 不再是付费分层（来源：`skills/llms.txt` 与 `skills/gsap-plugins/SKILL.md` 的 Licensing & Install 节）。

| 项 | 现状 |
|---|---|
| 授权 | 全部插件免费，**不需要**会员、license key 或 auth token |
| 安装 | `npm install gsap` —— 所有插件都在包里，按路径导入：`gsap/SplitText`、`gsap/MorphSVGPlugin` 等；React 侧另装 `npm install @gsap/react`，`useGSAP` 需要先 `gsap.registerPlugin(useGSAP)` |

**禁止**（过时且错误，agent 不得输出）：生成带 GreenSock auth token 的 `.npmrc`；指向私有 `npm.greensock.com` registry；要求用户注册 Club GSAP 才能用插件；因「这是付费插件」而拒用 SplitText / MorphSVG / ScrollSmoother / InertiaPlugin，或建议改用别的库替代。过时认知导致的错误行为等同事实性错误，按缺陷处理。

---

## C. 核心 API

三个入口方法，按「起止状态从哪来」区分：

| 方法 | 语义 | 用在哪 |
|---|---|---|
| `gsap.to(targets, vars)` | 从**当前状态**到 `vars` | 默认选择，最常用 |
| `gsap.from(targets, vars)` | 从 `vars` 到**当前状态** | 入场；当前状态就是终态 |
| `gsap.fromTo(targets, fromVars, toVars)` | 显式给两端，不读当前值 | 需要确定性起止、避免读到脏值 |
| `gsap.set(targets, vars)` | 立即应用（duration 0） | 初始化定位，不参与时间轴 |

```js
gsap.to(".box", { x: 100, rotation: "360_cw", duration: 1 });
gsap.from(".card", { autoAlpha: 0, y: 20, stagger: 0.1, duration: 0.4 });
gsap.set(".pin", { transformOrigin: "left top" });
```

**变量规范**：属性名一律 **camelCase**（`backgroundColor`、`rotationX`）；`duration` 单位是**秒**，默认 `0.5`；`ease` 默认 `"power1.out"`；`stagger` 可给数字（间隔秒数）或对象 `{ amount: 0.3, from: "center" }`、`{ each: 0.1, from: "random" }`，`from` 可取 `"start" | "center" | "end" | "edges" | "random" | index`；`overwrite` 默认 `false`，`true` 立刻杀掉同目标所有活动 tween，`"auto"` 只杀首次渲染时重叠的属性；`repeat`（数字或 `-1` 无限）、`yoyo`（配合 repeat 往返）；`onStart` / `onUpdate` / `onComplete` 的作用域是 Animation 实例本身。

`immediateRender`：`from()` / `fromTo()` 默认为 `true`（创建时立刻应用起始态，避免无样式闪烁）。**同一目标同一属性叠加多个 `from()` / `fromTo()` 时，给后建的加 `immediateRender: false`**，否则先建的终态会被提前覆盖，第二个动画看不到。

**transform 别名优先于裸 `transform` 字符串**（顺序固定：translate → scale → rotationX/Y → skew → rotation，性能更好、跨浏览器可靠）：`x` / `y` / `z`（translateX/Y/Z，默认 px）；`xPercent` / `yPercent`（百分比位移，SVG 上可用）；`scale` / `scaleX` / `scaleY`（`scale` 同时设两轴）；`rotation` / `rotationX` / `rotationY`（默认 deg，也可 `"1.25rad"`）；`skewX` / `skewY`（deg 或 rad 字符串）；`transformOrigin`（如 `"left top"`、`"50% 50%"`）。

- 相对值：`x: "+=20"`、`rotation: "-=30"`；`"*=2"` 乘、`"/=2"` 除。
- 方向后缀：`rotation: "-170_short"`（走最短路径）、`_cw`、`_ccw`，适用于 `rotation` / `rotationX` / `rotationY`。
- `autoAlpha` 优于 `opacity` 做淡入淡出：值为 `0` 时同时设 `visibility: hidden`（不可点击、渲染更省）；非 `0` 时设回 `inherit`。
- CSS 变量可动画：`{ "--hue": 180 }`。
- `svgOrigin`：SVG 全局坐标系的原点（如 `"250 100"`），**与 `transformOrigin` 互斥，只能用一个**；无百分比。
- `clearProps`：tween 完成后从行内样式移除指定属性（`"all"` / `true`）；**清除任一 transform 相关属性会清掉整个 transform**。
- 函数式值：`x: (i, target, targetsArray) => i * 50`，每个目标首次渲染时各调用一次。
- `gsap.defaults({ duration: 0.6, ease: "power2.out" })` 设全局默认。
- 控制播放要先存返回值：`const t = gsap.to(...)`，再 `t.pause()` / `t.reverse()` / `t.progress(0.5)` / `t.time(0.2)` / `t.kill()`。

**ease 命名**（基名等同于 `.out`；`power` 数字越大曲线越陡）：`none`；`power1`–`power4`；`back`、`bounce`、`circ`、`elastic`、`expo`、`sine` —— 后两组每族各有 `.in` / `.out` / `.inOut` 三档，如 `power2.out`、`back.out(1.7)`、`elastic.out(1, 0.3)`。选择判据：默认 `power1.out`；需要过冲回弹用 `back.out(1.7)`；需要衰减振荡用 `elastic.out(1, 0.3)`；滚动绑定用 `none`。内置 ease 够用就别上 CustomEase。扩展命名 ease（SlowMo、RoughEase、ExpoScaleEase）来自 **EasePack**。

---

## D. 时间轴

```js
const tl = gsap.timeline({ defaults: { duration: 0.5, ease: "power2.out" } });
tl.to(".a", { x: 100 })
  .to(".b", { y: 50 }, "+=0.2")
  .to(".c", { autoAlpha: 0 }, "-=0.1");
```

- 默认是**追加**，按顺序接在后面。
- 构造函数选项：`paused: true`（建后暂停，`.play()` 启动）、`repeat`、`yoyo`、时间轴级 `onComplete` / `onStart` / `onUpdate`、`defaults`（合并进每个子 tween）。
- **`defaults` 必须传给时间轴构造函数**，子 tween 才继承时长与缓动；时间轴自身的 `duration` 由子动画决定，不是构造参数。

**position parameter**（第三个参数，或 vars 里的 `position`）：

| 写法 | 含义 |
|---|---|
| `1` | 绝对 1 秒处 |
| `"+=0.5"` | 上一个结束点之后 0.5 秒 |
| `"-=0.2"` | 上一个结束点之前 0.2 秒（重叠） |
| `">"` | 上一个动画结束时（默认行为） |
| `"<"` | 上一个动画开始时（与上一个同起点） |
| `"<0.2"` | 上一个动画开始后 0.2 秒 |
| `"labelName"` / `"labelName+=0.3"` | 标签处 / 标签后 0.3 秒 |

**标签**：`tl.addLabel("intro", 0)`，之后用 `"intro"` 定位；`tl.play("outro")` 从标签起播；`tl.tweenFromTo("intro", "outro")` 暂停时间轴并返回一个无缓动、把播放头从 intro 移到 outro 的新 tween。

**嵌套**：`master.add(child, 0)` 把子时间轴整体放进父轴。

**播放与进度**：`play()` / `pause()` / `reverse()` / `restart()` / `time(2)` / `progress(0.5)` / `kill()`（默认连带杀掉子动画）。

**硬约束**：ScrollTrigger 只能挂在时间轴本身或顶层 tween 上。`gsap.timeline().to(".a", { scrollTrigger: {...} })` 是错的写法。

---

## E. ScrollTrigger

注册一次，全局只做一次：`gsap.registerPlugin(ScrollTrigger)`。

```js
gsap.to(".box", {
  x: 500,
  scrollTrigger: {
    trigger: ".box",
    start: "top center",
    end: "bottom center",
    toggleActions: "play reverse play reverse"
  }
});
```

**start / end 格式**：`"触发点 视口点"`，如 `"top top"`、`"center center"`、`"bottom 80%"`；也可给数字（滚动总像素）。相对写法 `"+=300"`、`"+=100%"`、`"max"`；v3.12+ 可用 `clamp()` 限制在页面范围内：`start: "clamp(top bottom)"`。可传函数，接收 ScrollTrigger 实例。默认 `start: "top bottom"`（`pin: true` 时为 `"top top"`），`end: "bottom top"`。

**核心配置**：

| 属性 | 说明 |
|---|---|
| `trigger` | 定义起始位置的元素（或用缩写 `scrollTrigger: ".selector"`，只设 trigger） |
| `start` / `end` / `endTrigger` | 触发区间；`endTrigger` 用于 end 基于另一个元素 |
| `scrub` | `true` 直接绑定；数字 = 播放头追上的秒数（`scrub: 1` 产生平滑滞后） |
| `toggleActions` | 四段顺序：onEnter / onLeave / onEnterBack / onLeaveBack，取值 `play pause resume reset restart complete reverse none`；默认 `"play none none none"` |
| `pin` / `pinSpacing` | 固定元素（`true` 固定 trigger 本身，**不要动画被 pin 的元素本身，动画它的子元素**）；`pinSpacing` 默认 `true` 补 spacer 防布局塌陷，可设 `false` 或 `"margin"` |
| `scroller` | 滚动容器，默认视口；可给可滚动 div |
| `once` / `id` | `once` 到达 end 一次后杀掉 ScrollTrigger（动画继续跑）；`id` 配合 `ScrollTrigger.getById(id)` 定点取用与销毁 |
| `refreshPriority` | 数字越小越先刷新；创建顺序非「页面上到下」时必须显式设置 |
| `snap` | 吸附进度：数字增量（`0.25`）、数组、`"labels"`，或对象 `{ snapTo, duration, delay, ease }` |
| `containerAnimation` | 假横向滚动的载体 tween（见下） |
| `markers` | 开发标记，**生产环境必须去掉** |
| 回调 | `onEnter` / `onLeave` / `onEnterBack` / `onLeaveBack` / `onUpdate` / `onToggle` / `onRefresh` / `onScrubComplete`，接收实例（含 `progress`、`direction`、`isActive`、`getVelocity()`） |

无关联 tween 时用 `ScrollTrigger.create({...})` 配回调手动处理（例如从 `self.progress` 更新 UI）。

**`ScrollTrigger.batch(triggers, vars)`**：给每个目标各建一个 ScrollTrigger，把短时间内触发的回调**批处理**。适合「刚进入视口的一批元素一起做 stagger」，可替代 IntersectionObserver。返回实例数组。

- 回调签名是**两个**参数：`(targets, scrollTriggers)`（普通 ScrollTrigger 回调只接收实例）。
- `vars` 里**不要**传 `trigger`，也不要传 `animation`、`scrub`、`snap`、`toggleActions`、`invalidateOnRefresh`、`onScrubComplete`、`onSnapComplete`。
- `interval`（默认约一帧）、`batchMax`（可用函数返回数字，便于响应式，refresh 时重新执行）。

```js
ScrollTrigger.batch(".card", {
  interval: 0.1,
  batchMax: 4,
  start: "top 80%",
  onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, stagger: 0.1, overwrite: true }),
  onLeaveBack: (batch) => gsap.set(batch, { autoAlpha: 0, y: 50, overwrite: true })
});
```

**刷新与清理**

- `ScrollTrigger.refresh()` 重算位置：字体加载完、图片、动态内容插入后必须调用。视口 resize 已自动处理（200ms 防抖）。
- 刷新按**创建顺序**（或 `refreshPriority`）执行。**按页面从上到下创建**，或在异步/乱序创建时显式设置 `refreshPriority`（页面上第一个区块给更小的数），否则 pin 间距等布局会算错。
- SPA 换页或元素移除时杀掉实例，别让它在陈旧元素上继续跑：

```js
ScrollTrigger.getAll().forEach(t => t.kill());
ScrollTrigger.getById("my-id")?.kill();
```

**假横向滚动（`containerAnimation`）**：pin 住面板，动画面板**内部子元素**的 `x` / `xPercent`，用垂直滚动拖它。

- 横向 tween **必须** `ease: "none"`，否则滚动位置与横向位置不成 1:1，这是最常见的错误。
- 用 `containerAnimation` 的 ScrollTrigger **不支持 pin 与 snap**。
- 不要横向移动 trigger 本身（移动了就要相应偏移 start/end）；动画子元素。

**常见坑**

- 未注册插件就用 ScrollTrigger。
- 在时间轴的子 tween 上挂 ScrollTrigger，或把带动画嵌进父时间轴——只在**顶层 tween 或时间轴本身**挂。
- 同时用 `scrub` 与 `toggleActions`（冲突时 scrub 生效，行为不明）——**二选一**。
- 视图切换后没杀实例，回到页面出现重复触发、双份动画；布局变了没 `refresh()`（resize 是自动的，动态内容**不自动**）。
- 生产环境留着 `markers: true`。

第三方平滑滚动库接管滚动时，必须用 `ScrollTrigger.scrollerProxy()` 覆写读写，并把 `ScrollTrigger.update` 注册为它的监听器（`smoothScroller.addListener(ScrollTrigger.update)`），否则所有计算都是旧的。GSAP 自带 ScrollSmoother，走它就不需要 proxy。

---

## F. React 与框架集成

**首选 `useGSAP`（来自 `@gsap/react`）**，不要用裸 `useEffect`：

```jsx
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP); // 用 useGSAP 前先注册，一次即可

const containerRef = useRef(null);

useGSAP(() => {
  gsap.to(boxRef.current, { x: 100, duration: 0.6, ease: "power2" });
  gsap.from(".item", { autoAlpha: 0, y: 20, stagger: 0.1 });
}, { scope: containerRef });
```

- **必须传 `scope`**（ref 或元素）：选择器字符串只在该子树内匹配。不传 scope 的选择器会打到组件外，是明确禁止项。
- 卸载时自动 revert 动画与 ScrollTrigger；**`contextSafe`** 用于在 `useGSAP` 执行**之后**才创建的对象（事件回调里的 tween，不在 context 内、不会被清理）——用 `useGSAP((context, contextSafe) => {...})` 拿到的 `contextSafe(fn)` 包一层，并在 cleanup 里对称移除监听器。插件注册在应用顶层或首次使用前，**不要放在会重复渲染的组件体内**。
- 第二个参数：依赖数组（默认空，不会每次渲染都执行），或配置对象 `{ dependencies: [endX], scope: container, revertOnUpdate: true }`；`revertOnUpdate: true` 表示每次依赖变化都先 revert 再重跑。

不用 `useGSAP` 时：在 `useEffect` 里 `gsap.context(() => {...}, containerRef)`，并在 cleanup **必须** `return () => ctx.revert()`，否则泄漏 + 在已卸载节点上更新。生命周期只有两条：**Mount**（`useGSAP` / `onMounted` / `onMount`）在 context/scope 内创建 tween 与 ScrollTrigger；**Unmount**（revert / `onUnmounted` / onMount 返回的 cleanup）调 `ctx.revert()`，杀掉动画与 ScrollTrigger 并还原行内样式。

Vue 3 用 `onMounted` 创建 + `onUnmounted` 调 `ctx?.revert()`，scope 传 `container.value`；Svelte 用 `onMount` 并 `return () => ctx.revert()`，scope 传 `bind:this` 拿到的元素。**不要在组件 setup 或根部同步脚本里创建动画**——DOM 还不存在。Nuxt（仓库 `examples/nuxt/`）额外用可复用 composable 注册插件，并对用得少的插件做 `import("gsap/SplitText")` 之类的**懒加载**控制首屏体积；组件内仍走 `gsap.context(scope)` + revert。

**SSR**：GSAP 跑在浏览器。**SSR 期间不得调用 gsap 或 ScrollTrigger**——用 `useGSAP` / `useEffect` 把全部 GSAP 代码限制在客户端。顶层 import 可以，但要保证服务端渲染路径不执行 `gsap.*` / `ScrollTrigger.*`；在意体积时在 effect 内动态 import。

`gsap.utils.selector(scope)` 可拿到一个限定在容器/ref 内的选择器函数（内部会处理 `.current`），组件里需要反复查询时用它。

---

## G. 性能红线

| 允许（合成器线程） | 禁止（触发布局/重绘） |
|---|---|
| `x`、`y`、`scale`、`scaleX/Y`、`rotation`、`skewX/Y`、`opacity` | `width`、`height`、`top`、`left`、`margin`、`padding` |

`x` / `y` 默认就是 transform（translate），所以位移一律用它，不用 `left` / `top`。

- **`will-change` 只加在真正会动画的元素上**（CSS 里 `will-change: transform;`）。「以防万一」地全站加、或给每个元素设 `force3D`，会创建大量合成层，反而更慢。
- GSAP 内部已批处理更新。混写直接 DOM 读写时，先把所有读做完再做写，不要读写交错，否则反复触发 layout thrashing。
- 同一种动画用**一个 `stagger`**，不要写一堆手算 `delay` 的独立 tween；长列表考虑虚拟化或只动画可见项，避免同时建几百个 tween / ScrollTrigger 而不在低端设备上验；时间轴要复用，不要每帧新建。
- 高频更新的属性（鼠标跟随、拖拽位移）用 **`gsap.quickTo()`**：它复用同一个 tween，而不是每次事件新建 tween 造成 GC 抖动。

```js
let xTo = gsap.quickTo("#cursor", "x", { duration: 0.4, ease: "power3" });
document.querySelector("#stage").addEventListener("pointermove", (e) => xTo(e.pageX));
```

- 离屏或不可见的动画要 pause / kill（例如切走路由时）。
- ScrollTrigger 侧：只 pin 必要的元素（`pin: true` 会提升该元素为一个层）；`scrub` 用小的数值（如 `scrub: 1`）可减少滚动期间的工作量；`refresh()` 只在布局真的变化时调用并做防抖，不要挂在每次 resize 上。
- 所有动效都要有 `prefers-reduced-motion` 分支。GSAP 侧用 `gsap.matchMedia()`（3.11+）：查询不匹配时其中创建的所有动画与 ScrollTrigger **自动 revert**；`mm.revert()` 全量回退。可用对象式条件一次写多档（`isDesktop` / `isMobile` / `reduceMotion`），命中 reduce 时用 `duration: 0` 或直接跳过。**不要在 matchMedia 内再嵌 `gsap.context()`**——matchMedia 内部已经是 context。

---

## H. 插件清单

全部免费，全部从公共 `gsap` 包导入（见 B 节）。用哪个就 `gsap.registerPlugin(...)` 哪一个。

| 插件 | 导入路径 | 用来做什么效果 |
|---|---|---|
| ScrollTrigger | `gsap/ScrollTrigger` | 滚动驱动：触发、pin、scrub、批次回调 |
| ScrollToPlugin | `gsap/ScrollToPlugin` | 把滚动位置**动画**到某个元素/坐标（`scrollTo: { y: "#section", offsetY: 50 }`、`x: "max"`），不建 ScrollTrigger |
| ScrollSmoother | `gsap/ScrollSmoother` | 带惯性的平滑滚动包裹层；需要 ScrollTrigger 与固定 DOM 结构（`#smooth-wrapper` > `#smooth-content`），在 ScrollTrigger 之后注册 |
| Flip | `gsap/Flip` | 布局状态间的 FLIP 过渡：`Flip.getState()` → 改 DOM/class → `Flip.from()`，列表重排、网格切换、展开收起 |
| Draggable + InertiaPlugin | `gsap/Draggable`、`gsap/InertiaPlugin` | 拖拽 / 旋转 / 抛掷（`type: "x,y" | "rotation" | "scroll"`，`bounds`、`edgeResistance`、`cursor`）；`inertia: true` 或 `InertiaPlugin.track(el, "x")` 后 `inertia: { x: "auto" }` 做松手动量滑行 |
| Observer | `gsap/Observer` | 统一鼠标/触摸/滚轮输入，做滑动方向、手势逻辑而不绑定滚动位置（`onUp/onDown/onLeft/onRight`、`tolerance` 默认 10、`type`） |
| SplitText | `gsap/SplitText` | 把文本拆成字符/词/行（各自独立元素）做逐字逐行动画；`SplitText.create(target, { type: "words, chars" })`，用完 `revert()` 恢复原始文本节点 |
| ScrambleTextPlugin | `gsap/ScrambleTextPlugin` | 文字乱码/解码式切换效果 |
| DrawSVGPlugin | `gsap/DrawSVGPlugin` | 描边「画线/擦除」，动画 `stroke-dashoffset`（元素必须有可见 `stroke` 与 `stroke-width`） |
| MorphSVGPlugin | `gsap/MorphSVGPlugin` | 形状变形：动画 `d`，两端点数可不同（自动转三次贝塞尔）；`morphSVG: "#target"` 或对象式 `{ shape, type, map, shapeIndex, ... }` |
| MotionPathPlugin + MotionPathHelper | `gsap/MotionPathPlugin`、`gsap/MotionPathHelper` | 让元素沿 SVG 路径运动（`path`、`align`、`alignOrigin`、`autoRotate`、`curviness`）；Helper 是开发期可视化编辑器 |
| CustomEase | `gsap/CustomEase` | 自定义缓动曲线（cubic-bezier 简写或 SVG path 数据），内置 ease 不够用时才上 |
| EasePack | `gsap/EasePack` | 追加命名 ease：SlowMo、RoughEase、ExpoScaleEase |
| CustomWiggle + CustomBounce | `gsap/CustomWiggle`、`gsap/CustomBounce` | 抖动/摇摆式缓动（多次振荡）与可配强度的弹跳缓动 |
| Physics2DPlugin + PhysicsPropsPlugin | `gsap/Physics2DPlugin`、`gsap/PhysicsPropsPlugin` | 二维物理（`velocity` / `angle` / `gravity`）做弹道抛落；或给任意属性加物理（`velocity` / `acceleration` / `end`） |
| GSDevTools | `gsap/GSDevTools` | 调试时间轴的可视化刮擦/播放控制面板，**仅开发，不要上线** |
| PixiPlugin | `gsap/PixiPlugin` | 让 GSAP 直接动画 PixiJS 显示对象 |

插件实例（如 `SplitText`）在组件卸载或元素移除时要 `revert()`；包在 `gsap.context()` / `useGSAP()` 里时随 scope 一起回退。`SplitText` 用 `autoSplit: true` 时，动画必须写在 `onSplit()` 内并把动画 return 出去，才能在重新拆分时自动清理与同步进度。

---

## I. 常见错误清单

| 症状 | 原因 | 修法 |
|---|---|---|
| 动画看不到 / 一闪而过；元素淡出后仍挡住点击；两个动画互相打架 | 同属性叠了多个 `from()` / `fromTo()` 而后建的 `immediateRender: true` 提前覆盖终态；用 `opacity: 0` 隐藏；多个 tween 同时改同一目标 | 后建的 tween 加 `immediateRender: false`；隐藏改用 `autoAlpha: 0`（同时设 `visibility: hidden`）；明确设 `overwrite: true` 或 `"auto"` |
| 顺序动画靠一堆 `delay` 手算，改一处全崩；子 tween 没继承时长/缓动 | 用 delay 代替时间轴；`defaults` 传给了单个 tween 而非时间轴构造 | 改 `gsap.timeline()` + position parameter（`"<"` / `"+=x"` / 标签）；`gsap.timeline({ defaults: { duration, ease } })` |
| ScrollTrigger 完全不触发 | 忘记 `gsap.registerPlugin(ScrollTrigger)` | 全局注册一次 |
| 挂在时间轴子 tween 上的 ScrollTrigger 行为错乱 | ScrollTrigger 嵌在时间轴内部 | 移到时间轴本身或顶层 tween：`gsap.timeline({ scrollTrigger: {...} })` |
| 滚动动画忽快忽慢、与滚动位置脱节 | 同时设了 `scrub` 与 `toggleActions` | 二选一；`scrub` 用于连续绑定，`toggleActions` 用于离散播放/倒放 |
| 假横向滚动里嵌套触发点对不上 | 横向 tween 用了 `ease: "none"` 以外的缓动 | 横向 tween 强制 `ease: "none"`；pin/snap 在该模式下不可用 |
| pin 之后页面间距塌陷或错位；字体图片加载完后触发器位置全偏 | `pinSpacing` 被关，或创建/刷新顺序不对；布局变化后没刷新 | 保持 `pinSpacing: true`；按页面顺序创建或显式设 `refreshPriority`；布局变化后调 `ScrollTrigger.refresh()`（resize 自动处理，动态内容不会） |
| SPA 换页后动画重复播放 / 报错打在已移除元素上 | 没杀 ScrollTrigger 与 tween | 卸载时 `ctx.revert()`；或 `ScrollTrigger.getAll().forEach(t => t.kill())` / `getById(id).kill()` |
| 第三方平滑滚动库下所有 trigger 位置是错的 | 滚动位置不是原生 `scrollTop`，且没通知 ScrollTrigger | `ScrollTrigger.scrollerProxy()` 覆写读写，并 `smoothScroller.addListener(ScrollTrigger.update)`；或直接用 ScrollSmoother |
| React 里动画影响到了组件外的元素；回调里的动画卸载后仍在跑 | 选择器没 scope；回调中创建的 tween 不在 context 内 | `useGSAP(..., { scope: containerRef })` 或 `gsap.context(fn, scope)`；用 `contextSafe()` 包裹并在 cleanup 里对称移除监听器 |
| Next.js 构建/SSR 报 `document is not defined` | 服务端执行了 gsap / ScrollTrigger | 全部放进 `useGSAP` / `useEffect`；SSR 路径不碰 gsap |
| 滚动时掉帧、长列表卡顿；鼠标跟随 GC 抖动 | 动画了 `width` / `height` / `top` / `left` / `margin`；每次 mousemove 新建 tween | 换 `x` / `y` / `scale` / `rotation` / `opacity`；用 `gsap.quickTo()` |
| 全站都设了 `will-change` 反而更慢 | 合成层过多 | 只给真正在动画的元素设，动画结束移除 |
| 生产环境出现彩色标记线或调试面板 | `markers: true` 忘了关；打包了 GSDevTools | 上线前关掉 `markers`；GSDevTools 只在开发环境使用 |
| 屏幕阅读器把标题读成碎片 | SplitText 拆完后没还原 | 组件卸载时 `split.revert()`（放进 context 也可自动回退）；按需设 `aria: "auto"` |
| 用了「付费插件」而绕路实现 | 过时认知（见 B 节） | 直接 `npm install gsap` 并导入；不要生成 token 或指向私有 registry |
