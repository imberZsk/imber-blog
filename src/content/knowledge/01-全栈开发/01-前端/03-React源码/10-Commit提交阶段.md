# React 源码（10）- Commit 提交阶段

`packages/react-reconciler/src/ReactFiberWorkLoop.old.js` -> `performConcurrentWorkOnRoot` -> `finishConcurrentRender`-> `commitRoot`

Commit Phase 是 React 更新流程的最后阶段，它负责将 Render Phase 计算出来的变更（记录在 finishedWork Fiber 树上）实际应用到 DOM 上。

![](/posts/react-source/commit.png)

# 一、CommitRoot

```js
function commitRoot(
  root: FiberRoot,
  finishedWork: null | Fiber,
  lanes: Lanes,
  recoverableErrors: null | Array<CapturedValue<mixed>>,
  transitions: Array<Transition> | null,
  didIncludeRenderPhaseUpdate: boolean,
  spawnedLane: Lane,
  updatedLanes: Lanes,
  suspendedRetryLanes: Lanes,
  exitStatus: RootExitStatus,
  suspendedCommitReason: SuspendedCommitReason, // Profiling-only
  completedRenderStartTime: number, // Profiling-only
  completedRenderEndTime: number, // Profiling-only
): void {
  // ... 初始化和准备工作 ...

  // 标记 Root 完成状态，重置 workInProgressRoot 等
  markRootFinished(
    root,
    lanes,
    remainingLanes,
    spawnedLane,
    updatedLanes,
    suspendedRetryLanes,
  );

  // ... 其他准备工作，如处理 Profiler 日志，重置 commit 阶段更新标志 ...

  // 将 finishedWork 赋值给 pendingFinishedWork，用于后续处理
  pendingFinishedWork = finishedWork;
  pendingEffectsRoot = root;
  // ... 保存其他相关状态到 pendingXXX 变量 ...

  // 如果启用了 Passive Effects，并且 finishedWork 上有 PassiveMask 副作用标记，
  // 则调度一个回调来异步执行 Passive Effects。
  if ((finishedWork.subtreeFlags & passiveSubtreeMask) !== NoFlags ||
      (finishedWork.flags & passiveSubtreeMask) !== NoFlags) {
    if (!rootDoesHavePassiveEffects) {
      rootDoesHavePassiveEffects = true;
      scheduleCallback(NormalPriority, () => {
        flushPassiveEffects();
        return null;
      });
    }
  }

  // 正式开始 Commit Phase 的三个子阶段
  const subtreeHasEffects = (finishedWork.subtreeFlags & commitEffectMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & commitEffectMask) !== NoFlags;

  if (subtreeHasEffects || rootHasEffect) {
    // ** 阶段1: Before Mutation Effects **
    // -----------------------------------
    // 在实际 DOM 变更之前执行，主要用于读取 DOM 状态，
    // 例如执行类组件的 getSnapshotBeforeUpdate。
    // 也处理与 View Transitions 相关的准备工作。
    commitBeforeMutationEffects(root, finishedWork, lanes);

    // ** 阶段2: Mutation Effects **
    // ---------------------------
    // 执行实际的 DOM 插入、更新、删除操作。
    // 这个阶段会遍历 Fiber 树，根据 flags 执行对应的 DOM API 调用。
    commitMutationEffects(root, finishedWork, lanes);

    // 将 current 指针指向 finishedWork，完成 Fiber 树的切换
    root.current = finishedWork;

    // ** 阶段3: Layout Effects **
    // -------------------------
    // 在 DOM 变更之后，浏览器绘制之前同步执行。
    // 主要用于执行 useLayoutEffect Hook 的回调、类组件的 componentDidMount/Update。
    // 也处理 ref 的附加和分离。
    commitLayoutEffects(root, finishedWork, lanes);
  } else {
    // 如果没有副作用，直接更新 current 指针
    root.current = finishedWork;
  }

  // ... 清理工作，例如重置全局变量，处理 Profiler 提交后钩子 ...

  // 确保所有同步工作都已完成
  flushSyncWorkOnAllRoots();

  // ... 其他收尾工作，如处理 pending passive effects 的调度 ...
}
// ... existing code ...
```

Commit Phase 是同步执行的，不能被打断。 这个阶段的主要任务是将 Render Phase 计算出来的变更真实地应用到 DOM 上，并执行相关的生命周期方法（或 Hooks）。

在其内部大体上可以分为四个阶段，React 按顺序执行以下操作:

- Before Mutation Effects: 这是在 DOM 突变之前执行的副作用。
- DOM Mutations: 这是 React 实际将变更应用到 DOM 的阶段。
- Layout Effects: 这是在 DOM 突变完成后，同步执行的副作用。
- Passive Effects: 这是 React 用于异步执行副作用的阶段。

# 二、Before Mutation Effects

```js
// ... existing code ...
export function commitBeforeMutationEffects(
  root: FiberRoot,
  firstChild: Fiber,
  committedLanes: Lanes,
): void {
  focusedInstanceHandle = prepareForCommit(root.containerInfo); // 准备提交，例如在RN中获取焦点信息
  shouldFireAfterActiveInstanceBlur = false;

  const isViewTransitionEligible =
    enableViewTransition &&
    includesOnlyViewTransitionEligibleLanes(committedLanes);

  nextEffect = firstChild; // 从第一个子节点开始遍历
  commitBeforeMutationEffects_begin(isViewTransitionEligible);

  focusedInstanceHandle = null;
  resetAppearingViewTransitions();
}

function commitBeforeMutationEffects_begin(isViewTransitionEligible: boolean) {
  const subtreeMask = isViewTransitionEligible
    ? BeforeAndAfterMutationTransitionMask // 包含 Snapshot 和 ViewTransition 相关的 flags
    : BeforeMutationMask; // 通常只包含 Snapshot flag
  while (nextEffect !== null) {
    const fiber = nextEffect;
    const child = fiber.child;
    // 检查当前 Fiber 的 subtreeFlags 是否包含需要处理的副作用
    if ((fiber.subtreeFlags & subtreeMask) !== NoFlags && child !== null) {
      // ... 确保父节点存在 ...
      child.return = fiber;
      nextEffect = child; // 向下遍历
    } else {
      commitBeforeMutationEffects_complete(isViewTransitionEligible);
    }
  }
}

function commitBeforeMutationEffects_complete(isViewTransitionEligible: boolean) {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    // 实际处理当前 Fiber 的 BeforeMutation Effects
    commitBeforeMutationEffectsOnFiber(fiber, isViewTransitionEligible);
    const sibling = fiber.sibling;
    if (sibling !== null) {
      // ... 确保父节点存在 ...
      sibling.return = fiber.return;
      nextEffect = sibling; // 处理兄弟节点
      return;
    }
  }
}

// 真正执行单个 Fiber 的 BeforeMutation Effect 的函数
function commitBeforeMutationEffectsOnFiber(finishedWork: Fiber, isViewTransitionEligible: boolean) {
  const current = finishedWork.alternate;
  const flags = finishedWork.flags;

  if ((flags & Snapshot) !== NoFlags) { // 检查 Snapshot 标记
    switch (finishedWork.tag) {
      case ClassComponent:
        if (current !== null) {
          // 调用 getSnapshotBeforeUpdate
          commitClassSnapshot(current, finishedWork);
        }
        break;
      case HostRoot:
        // ... HostRoot 的 Snapshot 处理 (例如 Hydration) ...
        break;
      // ... 其他类型的 Fiber (HostComponent, HostText 等通常不处理 Snapshot) ...
    }
  }
  if (enableViewTransition && isViewTransitionEligible) {
    if ((flags & ViewTransitionNamedStatic) !== NoFlags) {
      // 视图过渡相关的处理
      commitBeforeUpdateViewTransition(finishedWork);
    }
  }
  // ...
}
// ... existing code ...
```

总而言之，commitBeforeMutationEffects 负责驱动整个“变更前副作用”的遍历，而 commitBeforeMutationEffectsOnFiber 是实际执行单个 Fiber 节点特定副作用（主要是 `getSnapshotBeforeUpdate` 的调用、焦点处理和视图过渡准备）的核心函数。

# 三、Mutation Effects

核心函数源码解析

在这个阶段，其实质是调用 `commitMutationEffectsOnFiber` 函数来处理 finishedWork(已完成的工作树)中的副作用。

```js
function commitMutationEffectsOnFiber(
    finishedWork: Fiber,
    root: FiberRoot,
    lanes: Lanes,
) {
    // ... Profiler 相关代码 ...
    const current = finishedWork.alternate
    const flags = finishedWork.flags

    switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent: {
        recursivelyTraverseMutationEffects(root, finishedWork, lanes) // 1. 递归处理子节点的 Mutation Effects
        commitReconciliationEffects(finishedWork, lanes) // 2. 处理当前节点的 Placement (插入)

        if (flags & Update) {
        // 3. 如果有 Update 标记 (通常由 Hook 副作用引起)
        // 卸载之前的插入副作用钩子 (useEffectEvent)
        commitHookEffectListUnmount(
            HookInsertion | HookHasEffect,
            finishedWork,
            finishedWork.return,
        )
        // 挂载新的插入副作用钩子 (useEffectEvent)
        commitHookEffectListMount(
            HookInsertion | HookHasEffect,
            finishedWork,
        )
        // 注意：常规的 useEffect 和 useLayoutEffect 的 unmount/mount 在此阶段不执行，
        // useLayoutEffect 在 Layout Effects 阶段，useEffect 在 Passive Effects 阶段。
        // 此处的 HookInsertion 指的是 useEffectEvent 这种特殊的 Hook。
        }
        break
    }
    case ClassComponent: {
        recursivelyTraverseMutationEffects(root, finishedWork, lanes) // 1. 递归处理子节点的 Mutation Effects
        commitReconciliationEffects(finishedWork, lanes) // 2. 处理当前节点的 Placement (插入)

        if (flags & Ref) {
        // 3. 如果有 Ref 标记 (解绑旧 ref)
        if (!offscreenSubtreeWasHidden && current !== null) {
            safelyDetachRef(current, current.return)
        }
        }
        // Callback 标记相关的 deferHiddenCallbacks 逻辑 (与 Offscreen 相关)
        break
    }
    case HostComponent: {
        // DOM 元素
        recursivelyTraverseMutationEffects(root, finishedWork, lanes) // 1. 递归处理子节点的 Mutation Effects
        commitReconciliationEffects(finishedWork, lanes) // 2. 处理当前节点的 Placement (插入)

        if (flags & Ref) {
        // 3. 如果有 Ref 标记 (解绑旧 ref)
        if (!offscreenSubtreeWasHidden && current !== null) {
            safelyDetachRef(current, current.return)
        }
        }
        if (supportsMutation) {
        if (finishedWork.flags & ContentReset) {
            // 4. 如果有 ContentReset 标记 (重置文本内容)
            commitHostResetTextContent(finishedWork)
        }

        if (flags & Update) {
            // 5. 如果有 Update 标记 (更新 DOM 属性)
            const instance: Instance = finishedWork.stateNode
            if (instance != null) {
            const newProps = finishedWork.memoizedProps
            const oldProps =
                current !== null ? current.memoizedProps : newProps
            commitHostUpdate(finishedWork, newProps, oldProps) // 调用 commitHostUpdate 执行 DOM 更新
            }
        }
        // FormReset 标记相关逻辑
        }
        break
    }
    case HostText: {
        // 文本节点
        recursivelyTraverseMutationEffects(root, finishedWork, lanes) // 1. 递归处理子节点的 Mutation Effects
        commitReconciliationEffects(finishedWork, lanes) // 2. 处理当前节点的 Placement (插入)

        if (flags & Update) {
        // 3. 如果有 Update 标记 (更新文本内容)
        if (supportsMutation) {
            // ... 省略错误检查 ...
            const newText: string = finishedWork.memoizedProps
            const oldText: string =
            current !== null ? current.memoizedProps : newText
            commitHostTextUpdate(finishedWork, newText, oldText) // 调用 commitHostTextUpdate 更新文本
        }
        }
        break
    }
    case HostRoot: {
        // ... Profiler 和 Hoistable 相关代码 ...
        recursivelyTraverseMutationEffects(root, finishedWork, lanes) // 1. 递归处理子节点的 Mutation Effects
        commitReconciliationEffects(finishedWork, lanes) // 2. 处理当前节点的 Placement (插入)

        if (flags & Update) {
        // 处理 Dehydrated 容器的提交
        // ...
        // 处理持久化模式下的根容器子节点
        // ...
        }
        // FormReset 相关逻辑
        // ...
        break
    }
    case HostPortal: {
        // ... Hoistable 相关代码 ...
        recursivelyTraverseMutationEffects(root, finishedWork, lanes) // 1. 递归处理子节点的 Mutation Effects
        commitReconciliationEffects(finishedWork, lanes) // 2. 处理当前节点的 Placement (插入)
        // ... 更新持久化模式下的 Portal 子节点 ...
        break
    }
    case SuspenseComponent: {
        recursivelyTraverseMutationEffects(root, finishedWork, lanes)
        commitReconciliationEffects(finishedWork, lanes)
        // ... 处理 Suspense 的回调和重试队列 ...
        break
    }
    case OffscreenComponent: {
        // ... 根据 Offscreen 状态处理子节点的 Mutation Effects 和 Reconciliation Effects ...
        // ... 处理 Visibility 变化，可能隐藏或显示子树 ...
        // ... 处理 Offscreen 的重试队列 ...
        break
    }
    // ... 其他 Fiber类型的处理，如 ViewTransitionComponent, ScopeComponent 等 ...
    default: {
        recursivelyTraverseMutationEffects(root, finishedWork, lanes)
        commitReconciliationEffects(finishedWork, lanes)
        break
    }
    }
    // ... Profiler 相关代码 ...
}
```

### 关键要点

- 顺序：Mutation 阶段的操作遵循一定的顺序：通常是先处理删除 (自顶向下递归卸载，然后移除 DOM)，然后处理子节点的 Mutations，再处理当前节点的插入和更新。
- DOM 操作：这是 React 实际修改浏览器 DOM 的阶段。
- Ref 解绑：旧的 ref 会在这个阶段被解绑。
- componentWillUnmount：类组件的 componentWillUnmount 生命周期方法在此阶段被调用（在 commitDeletionEffects 内部）。
- Hooks 清理：useEffect 和 useLayoutEffect 的清理函数逻辑上属于卸载的一部分，其执行时机虽然分别在 Passive 和 Layout 阶段，但触发点与此处的删除流程相关联。

# 四、Layout Effects

在 DOM Mutations 阶段，React 已经将所有计算出的变更应用到了实际的 DOM 上。Layout Effects 阶段在浏览器进行下一次绘制（paint）之前同步执行。这意味着在此阶段执行的代码会阻塞浏览器的渲染。

核心函数，`commitLayoutEffectOnFiber` 函数是递归遍历 Fiber 树并执行 Layout Effects 的核心函数。它会根据 Fiber 节点的 tag (类型) 和 flags (标记) 来执行不同的操作，例如调用 componentDidMount、componentDidUpdate生命周期方法，执行 useLayoutEffect Hook 的回调，以及处理 ref 的附加等。

commitLayoutEffectOnFiber 函数源码

```js
// ... existing code ...
function commitLayoutEffectOnFiber(
  finishedRoot: FiberRoot,
  current: Fiber | null,
  finishedWork: Fiber,
  committedLanes: Lanes,
): void {
  const prevEffectStart = pushComponentEffectStart();
  const prevEffectDuration = pushComponentEffectDuration();
  const prevEffectErrors = pushComponentEffectErrors();
  // When updating this function, also update reappearLayoutEffects, which does
  // most of the same things when an offscreen tree goes from hidden -> visible.
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      if (flags & Update) {
        commitHookLayoutEffects(finishedWork, HookLayout | HookHasEffect);
      }
      break;
    }
    case ClassComponent: {
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      if (flags & Update) {
        commitClassLayoutLifecycles(finishedWork, current);
      }

      if (flags & Callback) {
        commitClassCallbacks(finishedWork);
      }

      if (flags & Ref) {
        safelyAttachRef(finishedWork, finishedWork.return);
      }
      break;
    }
    case HostRoot: {
      const prevProfilerEffectDuration = pushNestedEffectDurations();
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );
      if (flags & Callback) {
        commitRootCallbacks(finishedWork);
      }
      if (enableProfilerTimer && enableProfilerCommitHooks) {
        finishedRoot.effectDuration += popNestedEffectDurations(
          prevProfilerEffectDuration,
        );
      }
      break;
    }
    case HostSingleton: {
      if (supportsSingletons) {
        // ... HostSingleton specific logic ...
        if (current === null && flags & Update) {
          commitHostSingletonAcquisition(finishedWork);
        }
      }
      // Fallthrough
    }
    case HostHoistable:
    case HostComponent: {
      recursivelyTraverseLayoutEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
      );

      if (current === null) { // 首次挂载
        if (flags & Update) {
          commitHostMount(finishedWork); // 例如：处理 autoFocus
        } else if (flags & Hydrate) {
          commitHostHydratedInstance(finishedWork);
        }
      }

      if (flags & Ref) {
        safelyAttachRef(finishedWork, finishedWork.return);
      }
      break;
    }
    case Profiler: {
      // ... Profiler specific logic ...
      break;
    }
    case ActivityComponent: {
      // ... ActivityComponent specific logic ...
      break;
    }
    case SuspenseComponent: {
      // ... SuspenseComponent specific logic ...
      break;
    }
    // ... other cases like OffscreenComponent, ScopeComponent, ViewTransitionComponent etc. ...
  }

  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  popComponentEffectErrors(prevEffectErrors);
}
// ... existing code ...
```

根据 Fiber 类型 (tag) 处理：

- FunctionComponent, ForwardRef, SimpleMemoComponent：
  如果存在 Update flag，则调用 `commitHookLayoutEffects` 来执行 `useLayoutEffect` Hook 的回调函数。HookLayout | HookHasEffect 标记指示执行那些带有 Layout 标签且实际存在 effect 的 Hook。

# 五、Passive Effects

这个阶段与 Layout Effects 不同，它的执行是异步的。这意味着 React 会在完成 DOM 突变和 Layout Effects 之后，允许浏览器先进行绘制（paint），然后再回来执行这些 Passive Effects。这样做的好处是它们不会阻塞浏览器的渲染，从而可以提升用户感知的性能。

### 核心特点：

1. 异步执行：这是 Passive Effects 与 Layout Effects 最显著的区别。Passive Effects 会在浏览器完成绘制（Paint）之后异步执行。这意味着它们不会阻塞浏览器的渲染流程，从而有助于提升用户感知的性能，特别适合数据获取、设置订阅、手动操作非 React 管理的 DOM（且不需要同步时）等操作。
2. 清理机制：useEffect Hook 返回的清理函数（cleanup function）也是作为 Passive Effect 的一部分执行的。这个清理函数会在以下两种情况执行：
   - 组件卸载前。
   - 在组件更新时，如果 useEffect 的依赖项发生变化，导致 effect 需要重新执行，那么在执行新的 effect 之前，会先执行上一次 effect 返回的清理函数。
3. 顺序保证：
   - 在一个组件内部，多个 useEffect 的执行顺序与它们在代码中定义的顺序一致。
   - 清理函数的执行顺序则与定义的顺序相反（即最后一个定义的 useEffect 的清理函数最先执行）。

# 六、总结

commit 阶段可以按职责粗分为四个阶段，简单理解它们各自做的事情：

- 提交前（Before Mutation）
  - 在真正写入宿主环境前做准备工作。
  - 触发类组件的 getSnapshotBeforeUpdate，收集快照。
  - 解绑旧的 ref，准备需要执行的副作用列表。

- 变更（Mutation）
  - 把变更真正写入宿主环境（如 DOM）。
  - 执行插入/更新/删除节点，更新属性与文本，处理内容移位等。

- 布局（Layout）
  - 变更完成后，此时可以安全读取布局信息。
  - 调用 useLayoutEffect 的清理与回调，绑定/更新 ref，
    调用类组件的 componentDidMount/componentDidUpdate。

- 被动（Passive）
  - 异步调度，不阻塞绘制，用于非布局相关副作用。
  - 调用 useEffect 的清理与回调，建立订阅、事件与异步任务等。

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“React 源码（10）- Commit 提交阶段”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
