import type { Node as TiptapNode } from '@tiptap/pm/model'
import { NodeSelection, Selection, TextSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'

/**
 * 文件上传的最大大小限制
 * 5MB = 5 * 1024 * 1024 字节
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * macOS 快捷键符号映射表
 * 将快捷键名称映射到对应的 macOS 符号
 */
export const MAC_SYMBOLS: Record<string, string> = {
  mod: '⌘', // Command 键
  command: '⌘', // Command 键（别名）
  meta: '⌘', // Meta 键（在 Mac 上等同于 Command）
  ctrl: '⌃', // Control 键
  control: '⌃', // Control 键（别名）
  alt: '⌥', // Option 键
  option: '⌥', // Option 键（别名）
  shift: '⇧', // Shift 键
  backspace: 'Del', // 退格键
  delete: '⌦', // Delete 键
  enter: '⏎', // 回车键
  escape: '⎋', // Esc 键
  capslock: '⇪' // Caps Lock 键
} as const

/**
 * 合并 CSS 类名的工具函数
 * 过滤掉 falsy 值（false、null、undefined、空字符串等），然后合并为字符串
 *
 * @param classes - 要合并的类名数组，可以是字符串、布尔值、undefined 或 null
 * @returns 合并后的类名字符串，多个类名用空格分隔
 *
 * @example
 * ```ts
 * cn('foo', 'bar', false, null, 'baz') // 返回 'foo bar baz'
 * cn('active', isActive && 'highlight') // 根据 isActive 条件返回类名
 * ```
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * 判断当前平台是否为 macOS
 *
 * @returns 如果是 macOS 平台返回 true，否则返回 false
 *
 * @remarks
 * 通过检查 navigator.platform 是否包含 "mac" 来判断
 * 注意：此方法在服务端渲染时可能不可用
 */
export function isMac(): boolean {
  return typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')
}

/**
 * 根据平台格式化快捷键键名
 * 在 macOS 上返回对应的符号，在其他平台上返回格式化的文本
 *
 * @param key - 要格式化的键名（例如："ctrl"、"alt"、"shift"）
 * @param isMac - 是否为 macOS 平台
 * @param capitalize - 是否将键名首字母大写（默认：true）
 * @returns 格式化后的快捷键符号或文本
 *
 * @example
 * ```ts
 * formatShortcutKey('ctrl', true, true) // 返回 '⌃'（Mac 符号）
 * formatShortcutKey('ctrl', false, true) // 返回 'Ctrl'（非 Mac 平台）
 * formatShortcutKey('shift', true, false) // 返回 '⇧'（Mac 符号）
 * ```
 */
export const formatShortcutKey = (key: string, isMac: boolean, capitalize: boolean = true) => {
  // 如果是 Mac 平台，尝试从符号映射表中获取对应的符号
  if (isMac) {
    const lowerKey = key.toLowerCase()
    // 如果找到对应的符号则返回，否则根据 capitalize 参数返回大写或原始值
    return MAC_SYMBOLS[lowerKey] || (capitalize ? key.toUpperCase() : key)
  }

  // 非 Mac 平台：根据 capitalize 参数决定是否首字母大写
  return capitalize ? key.charAt(0).toUpperCase() + key.slice(1) : key
}

/**
 * 解析快捷键字符串为格式化后的键符号数组
 * 将类似 "ctrl+shift+b" 的字符串解析为格式化的键符号数组
 *
 * @param props - 配置对象
 * @param props.shortcutKeys - 快捷键字符串（例如："ctrl+shift+b"）
 * @param props.delimiter - 用于分割键的分隔符（默认："+"）
 * @param props.capitalize - 是否将键名首字母大写（默认：true）
 * @returns 格式化后的快捷键符号数组
 *
 * @example
 * ```ts
 * parseShortcutKeys({ shortcutKeys: 'ctrl+shift+b' })
 * // 在 Mac 上返回：['⌃', '⇧', 'B']
 * // 在非 Mac 上返回：['Ctrl', 'Shift', 'B']
 * ```
 */
export const parseShortcutKeys = (props: {
  shortcutKeys: string | undefined
  delimiter?: string
  capitalize?: boolean
}) => {
  const { shortcutKeys, delimiter = '+', capitalize = true } = props

  // 如果没有提供快捷键字符串，返回空数组
  if (!shortcutKeys) return []

  // 按分隔符分割、去除空格、格式化每个键
  return shortcutKeys
    .split(delimiter)
    .map((key) => key.trim())
    .map((key) => formatShortcutKey(key, isMac(), capitalize))
}

/**
 * 检查指定的 mark（标记）是否存在于编辑器 schema 中
 * Mark 是用于格式化文本的标记，如粗体、斜体等
 *
 * @param markName - 要检查的 mark 名称（例如："bold"、"italic"）
 * @param editor - Tiptap 编辑器实例
 * @returns 如果 mark 存在于 schema 中返回 true，否则返回 false
 *
 * @example
 * ```ts
 * isMarkInSchema('bold', editor) // 检查粗体标记是否存在
 * ```
 */
export const isMarkInSchema = (markName: string, editor: Editor | null): boolean => {
  // 如果编辑器或 schema 不存在，返回 false
  if (!editor?.schema) return false
  // 从 schema 的 marks 中查找指定的 mark
  return editor.schema.spec.marks.get(markName) !== undefined
}

/**
 * 检查指定的 node（节点）是否存在于编辑器 schema 中
 * Node 是文档结构的基本单位，如段落、标题、图片等
 *
 * @param nodeName - 要检查的节点名称（例如："paragraph"、"heading"、"image"）
 * @param editor - Tiptap 编辑器实例
 * @returns 如果节点存在于 schema 中返回 true，否则返回 false
 *
 * @example
 * ```ts
 * isNodeInSchema('image', editor) // 检查图片节点是否存在
 * ```
 */
export const isNodeInSchema = (nodeName: string, editor: Editor | null): boolean => {
  // 如果编辑器或 schema 不存在，返回 false
  if (!editor?.schema) return false
  // 从 schema 的 nodes 中查找指定的节点
  return editor.schema.spec.nodes.get(nodeName) !== undefined
}

/**
 * 将焦点移动到编辑器中的下一个节点
 * 如果当前是最后一个节点，则在文档末尾创建一个新段落并聚焦
 *
 * @param editor - Tiptap 编辑器实例
 * @returns 如果焦点成功移动返回 true，否则返回 false
 *
 * @remarks
 * 此函数用于实现类似 Tab 键的行为，将焦点移动到下一个可编辑节点
 */
export function focusNextNode(editor: Editor) {
  const { state, view } = editor
  const { doc, selection } = state

  // 尝试从当前选择位置向前查找下一个选择位置
  const nextSel = Selection.findFrom(selection.$to, 1, true)
  if (nextSel) {
    // 如果找到下一个位置，设置选择并滚动到视图
    view.dispatch(state.tr.setSelection(nextSel).scrollIntoView())
    return true
  }

  // 如果没有找到下一个节点，在文档末尾创建新段落
  const paragraphType = state.schema.nodes.paragraph
  if (!paragraphType) {
    console.warn('No paragraph node type found in schema.')
    return false
  }

  // 获取文档末尾位置
  const end = doc.content.size
  // 创建新段落节点
  const para = paragraphType.create()
  // 在文档末尾插入新段落
  let tr = state.tr.insert(end, para)

  // 将选择放置在新段落内部
  const $inside = tr.doc.resolve(end + 1)
  // 设置文本选择并滚动到视图
  tr = tr.setSelection(TextSelection.near($inside)).scrollIntoView()
  view.dispatch(tr)
  return true
}

/**
 * 检查值是否为有效的位置数字（类型守卫）
 * 有效位置必须是数字类型且大于等于 0
 *
 * @param pos - 要检查的值（可能是数字、null 或 undefined）
 * @returns 如果是有效位置返回 true，否则返回 false
 *
 * @remarks
 * 这是一个 TypeScript 类型守卫函数，用于在类型检查时缩小类型范围
 * 位置 0 是有效的（文档起始位置）
 */
export function isValidPosition(pos: number | null | undefined): pos is number {
  return typeof pos === 'number' && pos >= 0
}

/**
 * 检查一个或多个扩展是否在 Tiptap 编辑器中注册
 * 只要有一个扩展存在就返回 true
 *
 * @param editor - Tiptap 编辑器实例
 * @param extensionNames - 要检查的扩展名称（单个字符串或字符串数组）
 * @returns 如果至少有一个扩展可用返回 true，否则返回 false
 *
 * @example
 * ```ts
 * isExtensionAvailable(editor, 'bold') // 检查单个扩展
 * isExtensionAvailable(editor, ['bold', 'italic']) // 检查多个扩展
 * ```
 */
export function isExtensionAvailable(editor: Editor | null, extensionNames: string | string[]): boolean {
  if (!editor) return false

  // 将单个字符串转换为数组，统一处理
  const names = Array.isArray(extensionNames) ? extensionNames : [extensionNames]

  // 检查是否有任何一个扩展名称在编辑器的扩展列表中
  const found = names.some((name) => editor.extensionManager.extensions.some((ext) => ext.name === name))

  // 如果没找到任何扩展，输出警告信息
  if (!found) {
    console.warn(
      `None of the extensions [${names.join(', ')}] were found in the editor schema. Ensure they are included in the editor configuration.`
    )
  }

  return found
}

/**
 * 在指定位置查找节点（带错误处理）
 * 安全地从文档的指定位置获取节点，如果出错则返回 null
 *
 * @param editor - Tiptap 编辑器实例
 * @param position - 文档中要查找节点的位置
 * @returns 指定位置的节点，如果未找到或出错则返回 null
 *
 * @remarks
 * 此函数包含错误处理，避免因位置无效而抛出异常
 */
export function findNodeAtPosition(editor: Editor, position: number) {
  try {
    // 从文档的指定位置获取节点
    const node = editor.state.doc.nodeAt(position)
    if (!node) {
      console.warn(`No node found at position ${position}`)
      return null
    }
    return node
  } catch (error) {
    // 捕获任何错误（如位置无效）并返回 null
    console.error(`Error getting node at position ${position}:`, error)
    return null
  }
}

/**
 * 查找文档中节点的位置和实例
 * 可以通过节点实例或位置来查找，优先使用节点实例查找
 *
 * @param props - 配置对象
 * @param props.editor - Tiptap 编辑器实例
 * @param props.node - 要查找的节点（如果提供了 nodePos 则可选）
 * @param props.nodePos - 要查找的节点位置（如果提供了 node 则可选）
 * @returns 包含位置和节点的对象，如果未找到则返回 null
 *
 * @remarks
 * 查找策略：
 * 1. 如果提供了节点实例，遍历文档查找匹配的节点
 * 2. 如果提供了位置，直接从该位置获取节点
 * 3. 如果两者都提供，优先使用节点实例查找
 */
export function findNodePosition(props: {
  editor: Editor | null
  node?: TiptapNode | null
  nodePos?: number | null
}): { pos: number; node: TiptapNode } | null {
  const { editor, node, nodePos } = props

  // 基础检查：编辑器必须存在且有文档
  if (!editor || !editor.state?.doc) return null

  // 检查参数有效性
  // 注意：位置 0 是有效的（文档起始位置）
  const hasValidNode = node !== undefined && node !== null
  const hasValidPos = isValidPosition(nodePos)

  // 如果既没有有效节点也没有有效位置，返回 null
  if (!hasValidNode && !hasValidPos) {
    return null
  }

  // 策略 1：如果提供了节点实例，遍历文档查找该节点
  if (hasValidNode) {
    let foundPos = -1
    let foundNode: TiptapNode | null = null

    // 遍历文档的所有后代节点，查找匹配的节点
    editor.state.doc.descendants((currentNode, pos) => {
      // TODO: 是否需要检查节点类型？
      // if (currentNode.type && currentNode.type.name === node!.type.name) {
      // 使用严格相等比较节点实例
      if (currentNode === node) {
        foundPos = pos
        foundNode = currentNode
        return false // 停止遍历
      }
      return true // 继续遍历
    })

    // 如果找到了节点，返回位置和节点
    if (foundPos !== -1 && foundNode !== null) {
      return { pos: foundPos, node: foundNode }
    }
  }

  // 策略 2：如果提供了有效位置，直接从该位置获取节点
  if (hasValidPos) {
    const nodeAtPos = findNodeAtPosition(editor, nodePos!)
    if (nodeAtPos) {
      return { pos: nodePos!, node: nodeAtPos }
    }
  }

  return null
}

/**
 * 检查编辑器中的当前选择是否为指定类型的节点选择
 * 只检查节点选择（NodeSelection），不检查文本选择
 *
 * @param editor - Tiptap 编辑器实例
 * @param types - 要检查的节点类型名称数组
 * @returns 如果选中的节点匹配任何指定的类型返回 true，否则返回 false
 *
 * @example
 * ```ts
 * isNodeTypeSelected(editor, ['image']) // 检查是否选中了图片节点
 * isNodeTypeSelected(editor, ['image', 'video']) // 检查是否选中了图片或视频节点
 * ```
 */
export function isNodeTypeSelected(editor: Editor | null, types: string[] = []): boolean {
  // 基础检查：编辑器必须存在且有选择
  if (!editor || !editor.state.selection) return false

  const { state } = editor
  const { selection } = state

  // 如果选择为空，返回 false
  if (selection.empty) return false

  // 只检查节点选择类型
  if (selection instanceof NodeSelection) {
    const node = selection.node
    // 如果节点存在，检查其类型名称是否在指定的类型数组中
    return node ? types.includes(node.type.name) : false
  }

  // 其他类型的选择（如文本选择）返回 false
  return false
}

/**
 * 处理图片上传，支持进度跟踪和取消功能
 * 注意：这是一个演示/测试实现，在生产环境中需要替换为实际的上传逻辑
 *
 * @param file - 要上传的文件
 * @param onProgress - 可选的回调函数，用于跟踪上传进度
 * @param abortSignal - 可选的 AbortSignal，用于取消上传
 * @returns Promise，解析为上传后图片的 URL
 *
 * @throws {Error} 如果没有提供文件、文件大小超过限制或上传被取消
 *
 * @remarks
 * 当前实现是模拟上传，仅用于演示目的。
 * 在生产环境中，应该替换为实际的上传 API 调用。
 */
export const handleImageUpload = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  // 验证文件是否存在
  if (!file) {
    throw new Error('No file provided')
  }

  // 验证文件大小是否超过限制
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`)
  }

  // 演示/测试：模拟上传进度
  // 在生产环境中，请将以下代码替换为你自己的上传实现
  for (let progress = 0; progress <= 100; progress += 10) {
    // 检查是否已取消上传
    if (abortSignal?.aborted) {
      throw new Error('Upload cancelled')
    }
    // 模拟上传延迟
    await new Promise((resolve) => setTimeout(resolve, 500))
    // 触发进度回调
    onProgress?.({ progress })
  }

  // 返回占位图片 URL（演示用）
  return '/images/tiptap-ui-placeholder-image.jpg'
}

/**
 * 协议配置选项
 * 用于定义允许的 URL 协议
 */
type ProtocolOptions = {
  /**
   * 要注册的协议方案
   * @default ''
   * @example 'ftp'
   * @example 'git'
   */
  scheme: string

  /**
   * 如果启用，允许协议后可选斜杠
   * @default false
   * @example true
   */
  optionalSlashes?: boolean
}

/**
 * 协议配置类型
 * 可以是协议选项对象数组或字符串数组
 */
type ProtocolConfig = Array<ProtocolOptions | string>

/**
 * 属性空白字符正则表达式
 * 用于匹配各种空白字符（包括空格、制表符、换行符等 Unicode 空白字符）
 */
const ATTR_WHITESPACE = /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g

/**
 * 检查 URI 是否为允许的协议
 * 验证 URI 是否使用允许的协议，或是否为相对路径/非协议格式
 *
 * @param uri - 要检查的 URI 字符串（可能为 undefined）
 * @param protocols - 可选的协议配置，用于扩展允许的协议列表
 * @returns 如果 URI 为空、使用允许的协议或为相对路径返回 true，否则返回 false
 *
 * @remarks
 * 默认允许的协议包括：http, https, ftp, ftps, mailto, tel, callto, sms, cid, xmpp
 * 如果提供了 protocols 参数，会将这些协议添加到允许列表中
 */
export function isAllowedUri(uri: string | undefined, protocols?: ProtocolConfig) {
  // 默认允许的协议列表
  const allowedProtocols: string[] = ['http', 'https', 'ftp', 'ftps', 'mailto', 'tel', 'callto', 'sms', 'cid', 'xmpp']

  // 如果提供了自定义协议配置，添加到允许列表中
  if (protocols) {
    protocols.forEach((protocol) => {
      // 如果是字符串，直接使用；如果是对象，使用其 scheme 属性
      const nextProtocol = typeof protocol === 'string' ? protocol : protocol.scheme

      if (nextProtocol) {
        allowedProtocols.push(nextProtocol)
      }
    })
  }

  // 检查 URI：
  // 1. 如果 URI 为空，返回 true（允许空 URI）
  // 2. 移除空白字符后，检查是否匹配允许的协议或为相对路径
  return (
    !uri ||
    uri
      .replace(ATTR_WHITESPACE, '')
      .match(new RegExp(`^(?:(?:${allowedProtocols.join('|')}):|[^a-z]|[a-z0-9+.\-]+(?:[^a-z+.\-:]|$))`, 'i'))
  )
}

/**
 * 清理和验证 URL，确保其安全性
 * 将输入 URL 与基础 URL 组合，验证协议是否允许，返回安全的 URL
 *
 * @param inputUrl - 输入的 URL 字符串
 * @param baseUrl - 基础 URL，用于解析相对 URL
 * @param protocols - 可选的协议配置，用于扩展允许的协议列表
 * @returns 如果 URL 有效且协议允许，返回完整的 URL；否则返回 "#"
 *
 * @remarks
 * 此函数用于防止 XSS 攻击，确保只允许安全的协议
 * 如果 URL 创建失败或协议不被允许，返回安全的占位符 "#"
 *
 * @example
 * ```ts
 * sanitizeUrl('/path', 'https://example.com') // 返回 'https://example.com/path'
 * sanitizeUrl('javascript:alert(1)', 'https://example.com') // 返回 '#'（不安全协议）
 * ```
 */
export function sanitizeUrl(inputUrl: string, baseUrl: string, protocols?: ProtocolConfig): string {
  try {
    // 尝试创建 URL 对象（会自动处理相对 URL）
    const url = new URL(inputUrl, baseUrl)

    // 检查 URL 的协议是否允许
    if (isAllowedUri(url.href, protocols)) {
      return url.href
    }
  } catch {
    // 如果 URL 创建失败（如格式无效），视为无效 URL
  }
  // 返回安全的占位符，避免 XSS 攻击
  return '#'
}
