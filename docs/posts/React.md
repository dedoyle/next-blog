---
title: "React 架构"
date: "2021-12-23 22:35:09"
excerpt: "React 的架构以及 render 和 commit 阶段"
---

## React 的架构大概分为

- Scheduler（调度器）—— 调度任务的优先级，高优任务优先进入 Reconciler
- Reconciler（协调器）—— 负责找出变化的组件
- Renderer（渲染器）—— 负责将变化的组件渲染到页面上

Reconciler 工作的阶段被称为 render 阶段。因为在该阶段会调用组件的 render 方法。
Renderer 工作的阶段被称为 commit 阶段。就像你完成一个需求的编码后执行 git commit 提交代码。commit 阶段会把 render 阶段提交的信息渲染在页面上。
render 与 commit 阶段统称为 work，即 React 在工作中。相对应的，如果任务正在 Scheduler 内调度，就不属于 work。

## Render 阶段

Render 阶段开始于 performSyncWorkOnRoot 或 performConcurrentWorkOnRoot 方法的调用。这取决于本次更新是同步更新还是异步更新。

```js
// performSyncWorkOnRoot会调用该方法
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

// performConcurrentWorkOnRoot会调用该方法
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress)
  }
}
```

可以看到，他们唯一的区别是是否调用 shouldYield。如果当前浏览器帧没有剩余时间，shouldYield 会中止循环，直到浏览器有空闲时间后再继续遍历。

workInProgress 代表当前已创建的 workInProgress fiber。

performUnitOfWork 方法会创建下一个 Fiber 节点并赋值给 workInProgress，并将 workInProgress 与已创建的 Fiber 节点连接起来构成 Fiber 树。

我们知道 Fiber Reconciler 是从 Stack Reconciler 重构而来，通过遍历的方式实现可中断的递归，所以 performUnitOfWork 的工作可以分为两部分：“递”和“归”

### “递”阶段

首先从 rootFiber 开始向下深度优先遍历。为遍历到的每个 Fiber 节点调用 beginWork 方法。
该方法会根据传入的 Fiber 节点创建子 Fiber 节点，并将这两个 Fiber 节点连接起来。
当遍历到叶子节点（即没有子组件的组件）时就会进入“归”阶段。

### “归”阶段

在“归”阶段会调用 completeWork 处理 Fiber 节点。
当某个 Fiber 节点执行完 completeWork，
如果其存在兄弟 Fiber 节点（即 fiber.sibling !== null），会进入其兄弟 Fiber 的“递”阶段。
如果不存在兄弟 Fiber，会进入父级 Fiber 的“归”阶段。

“递”和“归”阶段会交错执行直到“归”到 rootFiber。至此，render 阶段的工作就结束了。

render 阶段全部工作完成。在 performSyncWorkOnRoot 函数中 fiberRootNode 被传递给 commitRoot 方法，开启 commit 阶段工作流程。

## Commit 阶段

commitRoot 方法是 commit 阶段工作的起点。fiberRootNode 会作为传参。

```js
commitRoot(root)
```

在 rootFiber.firstEffect 上保存了一条需要执行副作用的 Fiber 节点的单向链表 effectList，这些 Fiber 节点的 updateQueue 中保存了变化的 props。

这些副作用对应的 DOM 操作在 commit 阶段执行。

除此之外，一些生命周期钩子（比如 componentDidXXX）、hook（比如 useEffect）需要在 commit 阶段执行。

commit 阶段的主要工作（即 Renderer 的工作流程）分为三部分：

- before mutation 阶段（执行 DOM 操作前）
- mutation 阶段（执行 DOM 操作）
- layout 阶段（执行 DOM 操作后）

在 before mutation 阶段之前和 layout 阶段之后还有一些额外工作，涉及到比如 useEffect 的触发、优先级相关的重置、ref 的绑定/解绑。

### before mutation 之前

commitRootImpl 方法中直到第一句 `if (firstEffect !== null)` 之前属于 before mutation 之前。

before mutation 之前主要做一些变量赋值，状态重置的工作。

### layout 之后

主要包括三点内容：

- useEffect 相关的处理。
- 性能追踪相关。
  源码里有很多和 interaction 相关的变量。他们都和追踪 React 渲染时间、性能相关，在 Profiler API 和 DevTools 中使用。
- 在 commit 阶段会触发一些生命周期钩子（如 componentDidXXX）和 hook（如 useLayoutEffect、useEffect）。

在这些回调方法中可能触发新的更新，新的更新会开启新的 render-commit 流程。

### before mutation

before mutation 阶段的代码很短，整个过程就是遍历 effectList 并调用 commitBeforeMutationEffects 函数处理。

#### commitBeforeMutationEffects

整体可以分为三部分：

1. 处理 DOM 节点渲染/删除后的 autoFocus、blur 逻辑。
2. 调用 getSnapshotBeforeUpdate 生命周期钩子。
3. 调度 useEffect。

##### 调用 getSnapshotBeforeUpdate

从 Reactv16 开始，componentWillXXX 钩子前增加了 UNSAFE\_ 前缀。

究其原因，是因为 Stack Reconciler 重构为 Fiber Reconciler 后，render 阶段的任务可能中断/重新开始，对应的组件在 render 阶段的生命周期钩子（即 componentWillXXX ）可能触发多次。

为此，React 提供了替代的生命周期钩子 getSnapshotBeforeUpdate，可用于替换现有的 componentWillUnMount。

我们可以看见，getSnapshotBeforeUpdate 是在 commit 阶段内的 before mutation 阶段调用的，由于 commit 阶段是同步的，所以不会遇到多次调用的问题。

##### 调度 useEffect

scheduler 的 scheduleCallback，用于以某个优先级异步调度一个回调函数。

```js
// 调度useEffect
if ((effectTag & Passive) !== NoEffect) {
  if (!rootDoesHavePassiveEffects) {
    rootDoesHavePassiveEffects = true
    scheduleCallback(NormalSchedulerPriority, () => {
      // 触发useEffect
      flushPassiveEffects()
      return null
    })
  }
}
```

被异步调度的回调函数就是触发 useEffect 的方法 flushPassiveEffects。下面看看为 useEffect 如何以及为何被异步调度。

##### 如何异步调度 useEffect

flushPassiveEffects 方法内部会从全局变量 rootWithPendingPassiveEffects 获取 effectList。

effectList 中保存了需要执行副作用的 Fiber 节点。其中副作用包括

- 插入 DOM 节点（Placement）
- 更新 DOM 节点（Update）
- 删除 DOM 节点（Deletion）

关于 flushPassiveEffects 的具体讲解参照 useEffect 与 useLayoutEffect 一节

effectList 中保存了需要执行副作用的 Fiber 节点。其中副作用包括

- 插入 DOM 节点（Placement）
- 更新 DOM 节点（Update）
- 删除 DOM 节点（Deletion）

当一个 FunctionComponent 含有 useEffect 或 useLayoutEffect，他对应的 Fiber 节点也会被赋值 effectTag。

整个 useEffect 异步调用分为三步：

- before mutation 阶段在 scheduleCallback 中调度 flushPassiveEffects
- layout 阶段之后将 effectList 赋值给 rootWithPendingPassiveEffects
- scheduleCallback 触发 flushPassiveEffects，flushPassiveEffects 内部遍历 rootWithPendingPassiveEffects

为什么需要异步调用
摘录自 React 文档 effect 的执行时机：

与 componentDidMount、componentDidUpdate 不同的是，在浏览器完成布局与绘制之后，传给 useEffect 的函数会延迟调用。这使得它适用于许多常见的副作用场景，比如设置订阅和事件处理等情况，因此不应在函数中执行阻塞浏览器更新屏幕的操作。

可见，useEffect 异步执行的原因主要是**防止同步执行时阻塞浏览器渲染**。

### mutation 阶段

mutation 阶段也是遍历 effectList，执行函数。这里执行的是 commitMutationEffects。

```js
nextEffect = firstEffect
do {
  try {
    commitMutationEffects(root, renderPriorityLevel)
  } catch (error) {
    invariant(nextEffect !== null, 'Should be working on an effect.')
    captureCommitPhaseError(nextEffect, error)
    nextEffect = nextEffect.nextEffect
  }
} while (nextEffect !== null)
```

#### commitMutationEffects

```js
function commitMutationEffects(root: FiberRoot, renderPriorityLevel) {
  // 遍历effectList
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag

    // 根据 ContentReset effectTag重置文字节点
    if (effectTag & ContentReset) {
      commitResetTextContent(nextEffect)
    }

    // 更新ref
    if (effectTag & Ref) {
      const current = nextEffect.alternate
      if (current !== null) {
        commitDetachRef(current)
      }
    }

    // 根据 effectTag 分别处理
    const primaryEffectTag =
      effectTag & (Placement | Update | Deletion | Hydrating)
    switch (primaryEffectTag) {
      // 插入DOM
      case Placement: {
        commitPlacement(nextEffect)
        // ~ 取反
        nextEffect.effectTag &= ~Placement
        break
      }
      // 插入DOM 并 更新DOM
      case PlacementAndUpdate: {
        // 插入
        commitPlacement(nextEffect)

        nextEffect.effectTag &= ~Placement

        // 更新
        // current        是现在的 fiber
        // workInProgress 是新的 fiber
        // alternate      它们通过 alternate 连接
        const current = nextEffect.alternate
        commitWork(current, nextEffect)
        break
      }
      // SSR
      case Hydrating: {
        nextEffect.effectTag &= ~Hydrating
        break
      }
      // SSR
      case HydratingAndUpdate: {
        nextEffect.effectTag &= ~Hydrating

        const current = nextEffect.alternate
        commitWork(current, nextEffect)
        break
      }
      // 更新DOM
      case Update: {
        const current = nextEffect.alternate
        commitWork(current, nextEffect)
        break
      }
      // 删除DOM
      case Deletion: {
        commitDeletion(root, nextEffect, renderPriorityLevel)
        break
      }
    }

    nextEffect = nextEffect.nextEffect
  }
}
```

commitMutationEffects 会遍历 effectList，对每个 Fiber 节点执行如下三个操作：

- 根据 ContentReset effectTag 重置文字节点
- 更新 ref
- 根据 effectTag 分别处理，其中 effectTag 包括(Placement | Update | Deletion | Hydrating)

##### Placement effect

当 Fiber 节点含有 Placement effectTag，意味着该 Fiber 节点对应的 DOM 节点需要插入到页面中。[code](https://github.com/facebook/react/blob/970fa122d8188bafa600e9b5214833487fbf1092/packages/react-reconciler/src/ReactFiberCommitWork.new.js#L1156)

1. 获取父级 DOM 节点。其中 finishedWork 为传入的 Fiber 节点。

   ```js
   const parentFiber = getHostParentFiber(finishedWork)
   // 父级DOM节点
   const parentStateNode = parentFiber.stateNode
   ```

2. 获取 Fiber 节点的 DOM 兄弟节点

   ```js
   const before = getHostSibling(finishedWork)
   ```

3. 根据 DOM 兄弟节点是否存在决定调用 parentNode.insertBefore 或 parentNode.appendChild 执行 DOM 插入操作。

   ```js
   // parentStateNode是否是rootFiber
   if (isContainer) {
     insertOrAppendPlacementNodeIntoContainer(finishedWork, before, parent)
   } else {
     insertOrAppendPlacementNode(finishedWork, before, parent)
   }
   ```

值得注意的是，getHostSibling（获取兄弟 DOM 节点）的执行很耗时，当在同一个父 Fiber 节点下依次执行多个插入操作，getHostSibling 算法的复杂度为指数级。

这是由于 Fiber 节点不只包括 HostComponent，所以 Fiber 树和渲染的 DOM 树节点并不是一一对应的。要从 Fiber 节点找到 DOM 节点很可能跨层级遍历。

考虑如下例子：

```js
function Item() {
  return <li><li>;
}

function App() {
  return (
    <div>
      <Item/>
    </div>
  )
}

ReactDOM.render(<App/>, document.getElementById('root'));
```

对应的 Fiber 树和 DOM 树结构为：

```js
// Fiber树
          child      child      child       child
rootFiber -----> App -----> div -----> Item -----> li

// DOM树
#root ---> div ---> li
```

当在 div 的子节点 Item 前插入一个新节点 p，即 App 变为：

```js
function App() {
  return (
    <div>
      <p></p>
      <Item />
    </div>
  )
}
```

对应的 Fiber 树和 DOM 树结构为：

```js
// Fiber树
          child      child      child
rootFiber -----> App -----> div -----> p
                                       | sibling       child
                                       | -------> Item -----> li
// DOM树
#root ---> div ---> p
             |
               ---> li
```

此时 DOM 节点 p 的兄弟节点为 li，而 Fiber 节点 p 对应的兄弟 DOM 节点为 `fiberP.sibling.child`, 即 fiber p 的兄弟 fiber Item 的子 fiber li。

##### Update effect

当 Fiber 节点含有 Update effectTag，意味着该 Fiber 节点需要更新。调用的方法为 commitWork，他会根据 Fiber.tag 分别处理。[code](https://github.com/facebook/react/blob/970fa122d8188bafa600e9b5214833487fbf1092/packages/react-reconciler/src/ReactFiberCommitWork.new.js#L1441)

###### FunctionComponent mutation

当 fiber.tag 为 FunctionComponent，会调用 [commitHookEffectListUnmount](https://github.com/facebook/react/blob/970fa122d8188bafa600e9b5214833487fbf1092/packages/react-reconciler/src/ReactFiberCommitWork.new.js#L314)。该方法会遍历 effectList，执行所有 useLayoutEffect hook 的销毁函数。（mutation 阶段会执行 useLayoutEffect 的销毁函数!）

所谓“销毁函数”，见如下例子：

```js
useLayoutEffect(() => {
  // ...一些副作用逻辑

  return () => {
    // ...这就是销毁函数
  }
})
```

###### HostComponent mutation

当 fiber.tag 为 HostComponent，会调用 [commitUpdate](https://github.com/facebook/react/blob/970fa122d8188bafa600e9b5214833487fbf1092/packages/react-dom/src/client/ReactDOMHostConfig.js#L423)。

最终会在 [updateDOMProperties](https://github.com/facebook/react/blob/970fa122d8188bafa600e9b5214833487fbf1092/packages/react-dom/src/client/ReactDOMComponent.js#L378)中将 [render 阶段 completeWork](https://github.com/facebook/react/blob/970fa122d8188bafa600e9b5214833487fbf1092/packages/react-reconciler/src/ReactFiberCompleteWork.new.js#L229)中为 Fiber 节点赋值的 updateQueue 对应的内容渲染在页面上。

```js
for (let i = 0; i < updatePayload.length; i += 2) {
  const propKey = updatePayload[i]
  const propValue = updatePayload[i + 1]

  // 处理 style
  if (propKey === STYLE) {
    setValueForStyles(domElement, propValue)
    // 处理 DANGEROUSLY_SET_INNER_HTML
  } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
    setInnerHTML(domElement, propValue)
    // 处理 children
  } else if (propKey === CHILDREN) {
    setTextContent(domElement, propValue)
  } else {
    // 处理剩余 props
    setValueForProperty(domElement, propKey, propValue, isCustomComponentTag)
  }
}
```

##### Deletion effect

fiber 节点含有 Deletion effectTag，意味着该 fiber 节点对应的 DOM 节点需要从页面中删除，调用的方法为 [commitDeletion](https://github.com/facebook/react/blob/970fa122d8188bafa600e9b5214833487fbf1092/packages/react-reconciler/src/ReactFiberCommitWork.new.js#L1421)

该方法会执行以下操作：

1. 递归调用 Fiber 节点及其子孙 Fiber 节点中，fiber.tag 为 ClassComponent 的 [componentWillUnmount](https://github.com/facebook/react/blob/970fa122d8188bafa600e9b5214833487fbf1092/packages/react-reconciler/src/ReactFiberCommitWork.new.js#L920)生命周期钩子，从页面移除 Fiber 节点对应 DOM 节点
2. 解绑 ref
3. 调度 useEffect 的销毁函数

### layout 阶段

之所以称为 layout 阶段，是因为该阶段的代码都是在 DOM 渲染完成之后执行的。该阶段触发的生命周期钩子和 hook 能直接访问到改变后的 DOM，即该阶段是可以参与 DOM layout 的阶段。

类似前两个阶段，该阶段也是遍历 effectList，执行函数。

具体执行函数是 commitLayoutEffects。

```js
root.current = finishedWork

nextEffect = firstEffect
do {
  try {
    commitLayoutEffects(root, lanes)
  } catch (error) {
    invariant(nextEffect !== null, 'Should be working on an effect.')
    captureCommitPhaseError(nextEffect, error)
    nextEffect = nextEffect.nextEffect
  }
} while (nextEffect !== null)

nextEffect = null
```

#### commitLayoutEffects

[源码](https://github.com/facebook/react/blob/970fa122d8188bafa600e9b5214833487fbf1092/packages/react-reconciler/src/ReactFiberWorkLoop.new.js#L2302)

```js
function commitLayoutEffects(root: FiberRoot, committedLanes: Lanes) {
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag

    // 调用生命周期钩子和hook
    if (effectTag & (Update | Callback)) {
      const current = nextEffect.alternate
      commitLayoutEffectOnFiber(root, current, nextEffect, committedLanes)
    }

    // 赋值ref
    if (effectTag & Ref) {
      commitAttachRef(nextEffect)
    }

    nextEffect = nextEffect.nextEffect
  }
}
```

commitLayoutEffects 做了两件事：

1. commitLayoutEffectOnFiber（调用生命周期钩子和 hook 相关操作）
2. commitAttachRef（赋值 ref）

##### commitLayoutEffectOnFiber

[commitLayoutEffectOnFiber](https://github.com/facebook/react/blob/970fa122d8188bafa600e9b5214833487fbf1092/packages/react-reconciler/src/ReactFiberCommitWork.new.js#L459) 是别名，原名为 commitLifeCycles。

- 对于 ClassComponent，他会通过 current === null?区分是 mount 还是 update，调用 componentDidMount (opens new window)或 componentDidUpdate。

触发状态更新的 `this.setState` 如果赋值了第二个参数回调函数，也会在此时调用。

```js
this.setState({ xxx: 1 }, () => {
  console.log('i am update~')
})
```

- 对于 FunctionComponent 及相关类型，他会调用 useLayoutEffect hook 的回调函数，调度 useEffect 的销毁与回调函数。
  相关类型值特殊处理后的 FunctionComponent，比如 ForwardRef、React.memo 包裹的 FunctionComponent。

```js
switch (finishedWork.tag) {
  // 以下都是FunctionComponent及相关类型
  case FunctionComponent:
  case ForwardRef:
  case SimpleMemoComponent:
  case Block: {
    // 执行useLayoutEffect的回调函数
    commitHookEffectListMount(HookLayout | HookHasEffect, finishedWork)
    // 调度useEffect的销毁函数与回调函数
    schedulePassiveEffects(finishedWork)
    return
  }
}
```

在上一节介绍 update effect 时讲到，mutation 阶段会执行 useLayoutEffect hook 的销毁函数。

结合这里可以看到，useLayoutEffect hook 从上一次更新的销毁函数调用到本次更新的回调函数调用时同步执行的。

而 useEffect 则需要先调度，在 layout 阶段完成后再异步执行。

- 对于 HostRoot，即 rootFiber，如果赋值了第三个参数回调函数，也会在此时调用。

```js
ReactDOM.render(<App />, document.querySelector('#root'), function () {
  console.log('i am mount~')
})
```

##### commitAttachRef

[code](https://github.com/facebook/react/blob/970fa122d8188bafa600e9b5214833487fbf1092/packages/react-reconciler/src/ReactFiberCommitWork.new.js#L823)

```js
function commitAttachRef(finishedWork: Fiber) {
  const ref = finishedWork.ref
  if (ref !== null) {
    const instance = finishedWork.stateNode
    // 获取 DOM 实例
    let instanceToUse
    switch (finishedWork.tag) {
      case HostComponent:
        instanceToUse = getPublicInstance(instance)
        break
      default:
        instanceToUse = instance
    }
    // Moved outside to ensure DCE works with this flag
    if (enableScopeAPI && finishedWork.tag === ScopeComponent) {
      instanceToUse = instance
    }
    // 更新 ref
    if (typeof ref === 'function') {
      ref(instanceToUse)
    } else {
      ref.current = instanceToUse
    }
  }
}
```

### current Fiber 树切换

至此，整个 layout 阶段就结束了。[code](https://github.com/facebook/react/blob/970fa122d8188bafa600e9b5214833487fbf1092/packages/react-reconciler/src/ReactFiberWorkLoop.new.js#L2022)

```js
root.current = finishedWork
```

workInProgress Fiber 树在 commit 阶段完成渲染后会变为 current Fiber 树。这行代码的作用就是切换 fiberRootNode 指向的 current Fiber 树。

那么这行代码为什么在这里呢？（在 mutation 阶段结束后，layout 阶段开始前。）

我们知道 componentWillUnmount 会在 mutation 阶段执行。此时 current Fiber 树还指向前一次更新的 Fiber 树，在生命周期钩子内获取的 DOM 还是更新前的。

componentDidMount 和 componentDidUpdate 会在 layout 阶段执行。此时 current Fiber 树已经指向更新后的 Fiber 树，在生命周期钩子内获取的 DOM 就是更新后的。
