'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { THREE_ASSET_ROOT, type ThreeSceneSlug } from '@/app/lab/3d/config'

/** 源项目天空盒六面的纹理顺序。 */
const CUBE_TEXTURE_FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const
/** 标准场景的相机视角。 */
const SCENE_FIELD_OF_VIEW = 75
/** 相机可见范围的近端距离。 */
const CAMERA_NEAR_PLANE = 0.1
/** 相机可见范围的远端距离。 */
const CAMERA_FAR_PLANE = 3000
/** 地球每秒旋转的弧度数，避免高刷屏加速。 */
const EARTH_ROTATION_PER_SECOND = 0.6

/** 运行原项目的六类 Three.js 场景；sceneSlug 指定模型与场景构成。 */
export function ThreeScene({ sceneSlug }: { sceneSlug: ThreeSceneSlug }) {
  /** 当前 Canvas 的挂载容器，同时提供正确的可用尺寸。 */
  const containerRef = useRef<HTMLDivElement>(null)
  /** 加载模型或 WebGL 初始化失败时展示的状态。 */
  const [status, setStatus] = useState('正在加载场景…')
  /** 由博客主题决定普通场景和模型地面的背景色。 */
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    /** 当前场景独占的容器。 */
    const container = containerRef.current
    if (!container) return
    setStatus('正在加载场景…')
    /** 防止异步模型在离开页面后重新挂载。 */
    let disposed = false
    /** 当前场景的 WebGL 渲染器。 */
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true })
    } catch {
      setStatus('当前浏览器无法初始化 WebGL，请启用硬件加速后重试。')
      return
    }
    /** 六类实验共享的场景对象。 */
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(resolvedTheme === 'dark' ? '#101211' : '#e9eeeb')
    /** 随容器尺寸更新的场景相机。 */
    const camera = new THREE.PerspectiveCamera(SCENE_FIELD_OF_VIEW, 1, CAMERA_NEAR_PLANE, CAMERA_FAR_PLANE)
    camera.position.z = sceneSlug === 'earth' ? 7 : 5
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    /** 六个场景均可通过鼠标或触摸自由观察。 */
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    /** 异步模型、贴图的统一加载与错误状态。 */
    const manager = new THREE.LoadingManager()
    manager.onLoad = () => {
      if (!disposed) setStatus('')
    }
    manager.onError = () => {
      if (!disposed) setStatus('部分模型或贴图加载失败，请刷新重试。')
    }
    /** 统一管理从本地资源加载的二维贴图。 */
    const textureLoader = new THREE.TextureLoader(manager)
    /** 地球压缩模型对应的本地解码器。 */
    const dracoLoader = new DRACOLoader(manager)
    /** 每帧旋转的地球对象。 */
    let earth: THREE.Object3D | null = null
    /** FBX 角色动画的混合器。 */
    let mixer: THREE.AnimationMixer | null = null
    /** 所有创建的几何体、材质和贴图，离开页面时统一释放。 */
    const resources = new Set<{ dispose(): void }>()

    /** 收集新对象的 GPU 资源；object 可以是异步加载或程序生成的场景树。 */
    function trackResources(object: THREE.Object3D) {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Sprite || child instanceof THREE.LineSegments) {
          if ('geometry' in child && child.geometry) resources.add(child.geometry)
          /** 对象可能使用一个材质或六面的材质数组。 */
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          for (const material of materials) {
            resources.add(material)
            for (const value of Object.values(material)) {
              if (value instanceof THREE.Texture) resources.add(value)
            }
          }
        }
      })
    }

    if (sceneSlug === 'normal') {
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), new THREE.MeshBasicMaterial({ color: 0x00ff00 })))
      scene.add(new THREE.GridHelper(10, 10))
      setStatus('')
    } else if (sceneSlug === 'scene') {
      /** 背景纹理按源项目六面顺序加载。 */
      const texture = new THREE.CubeTextureLoader(manager).load(
        CUBE_TEXTURE_FACES.map((face) => `${THREE_ASSET_ROOT}/${face}.png`)
      )
      resources.add(texture)
      scene.background = texture
    } else if (sceneSlug === 'sky-box') {
      /** 内侧可见的六面材质构成原天空盒实验。 */
      const materials = CUBE_TEXTURE_FACES.map(
        (face) =>
          new THREE.MeshBasicMaterial({
            map: textureLoader.load(`${THREE_ASSET_ROOT}/${face}.png`), // 每个立方体表面使用对应的本地纹理。
            side: THREE.BackSide // 相机在盒内观察纹理。
          })
      )
      scene.add(new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), materials))
    } else if (sceneSlug === 'circle-texture') {
      scene.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(256, 64, 64),
          new THREE.MeshBasicMaterial({
            map: textureLoader.load(`${THREE_ASSET_ROOT}/livingRoom.webp`), // 保留源项目的室内全景。
            side: THREE.BackSide // 从球体内部观察贴图。
          })
        )
      )
      /** 原项目房间提示点。 */
      const marker = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: textureLoader.load(`${THREE_ASSET_ROOT}/tip.png`) })
      )
      marker.position.set(-200, -4, -147)
      marker.scale.set(10, 10, 10)
      scene.add(marker)
      controls.enablePan = false
    } else if (sceneSlug === 'earth') {
      dracoLoader.setDecoderPath(`${THREE_ASSET_ROOT}/draco/gltf/`)
      new GLTFLoader(manager).setDRACOLoader(dracoLoader).load(`${THREE_ASSET_ROOT}/earthnew.glb`, (gltf) => {
        trackResources(gltf.scene)
        if (disposed) {
          resources.forEach((resource) => resource.dispose())
          return
        }
        earth = gltf.scene
        scene.add(earth)
      })
    } else if (sceneSlug === 'dance') {
      camera.fov = 45
      camera.position.set(100, 200, 300)
      controls.target.set(0, 100, 0)
      renderer.shadowMap.enabled = true
      scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 5))
      /** 为角色提供源项目中的主光和投影。 */
      const light = new THREE.DirectionalLight(0xffffff, 5)
      light.position.set(0, 200, 100)
      light.castShadow = true
      scene.add(light)
      /** 承接角色阴影的地面。 */
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
      )
      ground.rotation.x = -Math.PI / 2
      ground.receiveShadow = true
      scene.add(ground, new THREE.GridHelper(2000, 20))
      new FBXLoader(manager).load(`${THREE_ASSET_ROOT}/model/dance.fbx`, (object) => {
        trackResources(object)
        if (disposed) {
          resources.forEach((resource) => resource.dispose())
          return
        }
        scene.add(object)
        mixer = new THREE.AnimationMixer(object)
        /** 动画文件可能缺失动画轨，避免直接访问首项。 */
        const clip = object.animations[0]
        if (clip) mixer.clipAction(clip).play()
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
      })
    }
    trackResources(scene)
    /** 根据容器而非整窗更新画布，适配博客导航与移动端。 */
    const resizeScene = () => {
      /** 当前容器的可用宽高。 */
      const { width, height } = container.getBoundingClientRect()
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    /** 容器尺寸监听器。 */
    const observer = new ResizeObserver(resizeScene)
    observer.observe(container)
    resizeScene()
    /** 前一帧时间，供模型动画使用实际时间差。 */
    let previousTime = 0
    renderer.setAnimationLoop((time) => {
      /** 当前帧与上一帧的秒数差，限制后台恢复时的跳跃。 */
      const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.1) : 0
      previousTime = time
      if (earth) earth.rotation.y += EARTH_ROTATION_PER_SECOND * delta
      mixer?.update(delta)
      controls.update()
      renderer.render(scene, camera)
    })

    return () => {
      disposed = true
      observer.disconnect()
      renderer.setAnimationLoop(null)
      controls.dispose()
      mixer?.stopAllAction()
      resources.forEach((resource) => resource.dispose())
      dracoLoader.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [sceneSlug, resolvedTheme])

  return (
    <div className="border-border relative overflow-hidden rounded-lg border">
      <div ref={containerRef} className="h-[65svh] min-h-80 w-full" aria-label="可拖动和缩放的 3D 场景" />
      {status ? (
        <p role="status" className="bg-background/90 absolute top-3 left-3 rounded px-3 py-2 text-sm">
          {status}
        </p>
      ) : null}
    </div>
  )
}
