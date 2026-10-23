/** 模型、贴图和预览统一放入独立公共资源目录。 */
export const THREE_ASSET_ROOT = '/frontend-lab/three'

/** 保留源项目的六类场景及其展示信息。 */
export const THREE_DEMOS = [
  {
    slug: 'normal', // 路由匹配的场景唯一名称。
    type: 'FOUNDATION', // 原项目的技术分类，用于预览展示和搜索。
    title: '基础场景', // 页面展示标题。
    description: '相机、绿色球体与网格，支持拖动旋转和缩放。', // 面向访问者的场景说明。
    image: 'normal.gif' // 本地场景预览文件名。
  },
  {
    slug: 'scene', // 路由匹配的场景唯一名称。
    type: 'ENVIRONMENT', // 原项目的技术分类，用于预览展示和搜索。
    title: '立方体场景', // 页面展示标题。
    description: '六面纹理构成的空间环境，支持自由观察。', // 面向访问者的场景说明。
    image: 'circle-texture.webp' // 本地场景预览文件名。
  },
  {
    slug: 'sky-box', // 路由匹配的场景唯一名称。
    type: 'ENVIRONMENT', // 原项目的技术分类，用于预览展示和搜索。
    title: '天空盒', // 页面展示标题。
    description: '将纹理映射到立方体内侧，形成沉浸式背景。', // 面向访问者的场景说明。
    image: 'skybox.webp' // 本地场景预览文件名。
  },
  {
    slug: 'circle-texture', // 路由匹配的场景唯一名称。
    type: 'PANORAMA', // 原项目的技术分类，用于预览展示和搜索。
    title: '全景看房', // 页面展示标题。
    description: '球面贴图与房间标记，支持室内全景浏览。', // 面向访问者的场景说明。
    image: 'circle-texture.webp' // 本地场景预览文件名。
  },
  {
    slug: 'earth', // 路由匹配的场景唯一名称。
    type: 'GLTF', // 原项目的技术分类，用于预览展示和搜索。
    title: '数据地球', // 页面展示标题。
    description: '加载原 GLTF 点阵模型，呈现持续旋转的地球。', // 面向访问者的场景说明。
    image: 'earth.gif' // 本地场景预览文件名。
  },
  {
    slug: 'dance', // 路由匹配的场景唯一名称。
    type: 'FBX', // 原项目的技术分类，用于预览展示和搜索。
    title: '角色动画', // 页面展示标题。
    description: '加载原 FBX 角色、骨骼动画与地面光影。', // 面向访问者的场景说明。
    image: 'dance.gif' // 本地场景预览文件名。
  }
] as const

/** 只允许加载登记过的场景。 */
export type ThreeSceneSlug = (typeof THREE_DEMOS)[number]['slug']
