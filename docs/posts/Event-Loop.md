---
title: "Event Loop"
date: "2022-01-09 21:39:00"
excerpt: "React 的架构以及 render 和 commit 阶段"
---

## 定义

whatwg 的标准里面讲了，为了协调事件、用户交互、脚本、渲染、网络等，用户代理必须使用事件循环。每个代理都有一个关联的事件循环，这是该代理独有的。

> The event loop of a similar-origin window agent is known as a window event loop. The event loop of a dedicated worker agent, shared worker agent, or service worker agent is known as a worker event loop. And the event loop of a worklet agent is known as a worklet event loop.

一个事件循环有一个或多个 task queues。一个 task queue 是一个 tasks set。

> Task queues are sets, not queues, because step one of the event loop processing model grabs the first runnable task from the chosen queue, instead of dequeuing the first task.The microtask queue is not a task queue.

## 任务

任务封装了如下的算法：

- Event: 派发一个事件给特定的 target 经常是由专门的任务去完成的。
- Parsing： HTML 解析通常是一个任务。
- Callbacks：调用一个回调经常是由一个专门的任务完成。
- Using a resource
- Reacting to DOM manipulation: 一些元素具有响应 DOM 操作而触发的任务，例如当该元素插入到 document 中时。

任务是一个结构, 它具有：

- steps
  A series of steps specifying the work to be done by the task.
- source
  One of the task sources, used to group and serialize related tasks.
- document
  A Document associated with the task, or null for tasks that are not in a window event loop.
- A script evaluation environment settings object set
  A set of environment settings objects used for tracking script evaluation during the task.

  每个任务都来自特定的任务源。本质上，在标准中任务源用于划分逻辑上不同类型的任务，用户代理使用任务队列来合并事件循环中的任务源。

例子：

一个用户代理可以有一个鼠标和按键事件的任务队列（用户交互任务源与之相关联），而另一个任务队列则与所有其他任务源相关联。 然后，使用在事件循环处理模型的初始步骤中授予的自由度，它可以在四分之三的时间内让键盘和鼠标事件优先于其他任务，保持界面响应但不会饿死其他任务队列。请注意，在此设置中，处理模型仍然强制用户代理永远不会无序地处理来自任何一个任务源的事件。

每个事件循环都有一个当前正在运行的任务，可以是一个任务或 null。默认为 null。
每个事件循环都有一个微任务队列，是一个微任务的队列，初始为空。

### 通用任务源

- DOM 操作任务源
  此任务源用于对 DOM 操作做出反应的功能，例如在将元素插入文档时以非阻塞方式发生的事情。

- 用户交互任务源
  此任务源用于响应用户交互的功能，例如键盘或鼠标输入。
  为响应用户输入而发送的 `click` 事件（例如事件）必须使用与用户交互任务源一起排队的任务来触发。[UI 事件]

- 网络任务源
  此任务源用于响应网络活动而触发的功能。

- 历史遍历任务源
  此任务源用于对调用 `history.back()` 和类似 API 进行排队。

## 事件循环的处理模式

根据 whatwg 关于事件循环标准中 [Processing model](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model)，当一个事件循环存在，它就会不断的执行一下步骤:

- 让任务队列成为事件循环的任务队列，选择的任务队列必须包含至少一个可执行的任务，若没有这样的队列，则直接跳到 Mircotasks 步骤。
- 从任务队列里取出第一个可执行的任务
- 将该任务赋给事件循环的 `currently running task`
- 记录任务起始时间
- 执行任务
- 事件循环
- 将事件循环的 `currently running task` 重置为 null
- Mircotasks: 执行 `microtask checkpoint`
  - 如果 `microtask checkpoint` 是 true 则返回
  - 将 `microtask checkpoint` 设置为 true
  - 当微任务队列不为空：
    - 从微任务队列出列一个微任务
    - 执行该微任务
  - 将 `microtask checkpoint` 设置为 false
- 将 `hasARenderingOpportunity` 置为 false
- 记录当前时间
- report 任务执行时间
- 更新渲染：如果这个事件循环是 `window event loop`：
  - 令 docs 为该事件循环的所有 Document 对象
  - 渲染机会：从 docs 中删除浏览上下文没有渲染机会的所有 Document 对象
    如果用户代理当前能够向用户呈现浏览上下文的内容，浏览上下文就有渲染机会。
    浏览上下文呈现机会是根据硬件约束（例如显示刷新率）和其他因素（例如页面性能或文档的可见性状态是否为 `visible`）确定的。
    渲染机会通常定期发生。
    标准不强制要求按任何特定模型来选择渲染机会。比如，如果浏览器试图达到 60Hz 刷新率，那么渲染机会最多可达每秒 60 次，每次大约 16.7ms。
    如果浏览器发现浏览上下文无法维持此速率，则该浏览上下文可能会下降到更可持续的每秒 30 次渲染机会，而不是偶尔丢帧。如果浏览上下文不可见，user agent 可能会决定将该页面降低到每秒 4 次甚至更低的频率。
  - 如果 docs 不为空，将 `hasARenderingOpportunity` 为 true。
  - 不必要的渲染：满足以下两个条件的 Document 将被从 docs 中移除：
    - user agent 认为更新 Document 浏览上下文的渲染不会有明显的效果，并且
    - Document 的 `map of animation frame callback` 为空（可以理解为 `requestAnimationFrame callback` 为空）。
  - 对于 docs 对象中的每个活动 document 文档
    - [刷新 autofocus](https://html.spec.whatwg.org/multipage/interaction.html#flush-autofocus-candidates)。
    - [执行 resize 步骤](https://drafts.csswg.org/cssom-view/#run-the-resize-steps)。
    - [执行 scroll 步骤](https://drafts.csswg.org/cssom-view/#run-the-scroll-steps)。
    - [执行媒体查询](https://drafts.csswg.org/cssom-view/#evaluate-media-queries-and-report-changes)。
    - [更新动画并发送事件](https://drafts.csswg.org/web-animations/#update-animations-and-send-events)。
    - [执行全屏步骤](https://fullscreen.spec.whatwg.org/#run-the-fullscreen-steps)。
    - user agent 检测到与 `CanvasRenderingContext2D` 或 `OffscreenCanvasRenderingContext2D` 关联的 context 已经丢失，则执行 `context to lost` 步骤。
    - [执行 animationFrame 回调](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#run-the-animation-frame-callbacks)，即 requestAnimationFrame 的回调。
    - [执行 intersection observations 步骤](https://w3c.github.io/IntersectionObserver/#run-the-update-intersection-observations-steps)，即 `IntersectionObserver` 回调。
    - 调用 `mark paint timeing` 算法。
    - 更新 Document 对应的呈现或用户界面及其浏览上下文，以反映当前状态。
- 如果以下所有都为真
  - this is a window event loop
  - in this event loop's task queues, there is no task whose document is fully active
  - this event loop's microtask queue is empty
  - hasARenderingOpportunity is false
    则：
    - 计算 `computeDeadline`
    - 为带 `computeDeadline` 的 window 执行 [start an idle period algorithm](https://w3c.github.io/requestidlecallback/#start-an-idle-period-algorithm)（requestIdleCallback）

## 微任务排队

根据 [whatwg 标准 微任务排队](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#microtask-queuing)，`self.queueMicrotask(callback)` 可用于在微任务队列上添加微任务。这允许他们的代码在下一次 js 执行上下文堆栈为空时运行。 不过，调度大量微任务和运行大量同步代码具有相同的性能劣势。两者都会阻止浏览器渲染。

在很多情况下，`requestAnimationFrame()` 或者 `requestIdleCallback()` 是更好的选择。特别是，如果目标是在下一个渲染周期之前运行代码，就用 `requestAnimationFrame()`。

`queueMicrotask()` 最常见的使用场景是创建一致的排序，即使在信息同步可用的情况下，也不会引入过度延迟。

```js
MyElement.prototype.loadData = function (url) {
  if (this._cache[url]) {
    queueMicrotask(() => {
      this._setData(this._cache[url])
      this.dispatchEvent(new Event('load'))
    })
  } else {
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((data) => {
        this._cache[url] = data
        this._setData(data)
        this.dispatchEvent(new Event('load'))
      })
  }
}
```

这样能保证有无 cache 运行顺序都一致。

另一个使用场景是实现不协调的“批处理”，比如说，你想尽可能快地将数据发送出去，但又不想发出多个网络请求，这时就可以用 `queueMicrotask`：

```js
const queuedToSend = []

function sendData(data) {
  queuedToSend.push(data)

  if (queuedToSend.length === 1) {
    queueMicrotask(() => {
      const stringToSend = JSON.stringify(queuedToSend)
      queuedToSend.length = 0

      fetch('/endpoint', stringToSend)
    })
  }
}
```

## 总结

浏览器中的事件循环主要由 Task、Microtask 和 Render 三个过程组成，每一轮事件循环都会检查两个任务队列是否有要执行的任务，等 js 上下文执行栈清空后，先清空微任务队列里所有的任务，然后判断是否需要渲染，如果不需要渲染继续下一轮循环。所以一般情况下，不是每一轮事件循环都会渲染，如果想在每次事件循环中或微任务之后执行一次绘制，可以通过 `requestAnimationFrame` 重新渲染。
