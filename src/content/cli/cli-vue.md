# Imber CLI Vue3 + Vite 模板详解

## 概述

Imber CLI 的 Vue3 + Vite 模板是一个现代化的 Vue.js 开发模板，基于 Vue 3.4+ 和 Vite 5+ 构建。该模板集成了 TypeScript、Pinia、Vue Router、Element Plus 等现代 Vue 生态工具，为开发者提供了一个功能完整、性能优异的 Vue 应用开发基础。

## 模板特性

### 核心特性

- **Vue 3.4+**：最新的 Composition API 和 `<script setup>` 语法
- **Vite 5+**：极速的开发服务器和构建工具
- **TypeScript**：完整的类型安全支持
- **Pinia**：现代化的状态管理
- **Vue Router 4**：官方路由解决方案
- **Element Plus**：企业级 UI 组件库
- **Vitest**：快速的单元测试框架
- **Cypress**：端到端测试
- **Storybook**：组件开发和文档

### 技术栈

```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "element-plus": "^2.4.0",
    "@element-plus/icons-vue": "^2.1.0",
    "axios": "^1.6.0",
    "@vueuse/core": "^10.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.5.0",
    "vite": "^5.0.0",
    "typescript": "^5.0.0",
    "vue-tsc": "^1.8.0",
    "vitest": "^1.0.0",
    "cypress": "^13.0.0",
    "@storybook/vue3": "^7.5.0"
  }
}
```

## 项目结构

### 目录结构

```
{{projectNameKebab}}/
├── src/
│   ├── components/            # 可复用组件
│   │   ├── common/           # 通用组件
│   │   ├── layout/           # 布局组件
│   │   └── business/         # 业务组件
│   ├── views/                # 页面组件
│   ├── router/               # 路由配置
│   │   └── index.ts
│   ├── stores/               # Pinia 状态管理
│   │   ├── modules/          # 状态模块
│   │   └── index.ts
│   ├── composables/          # 组合式函数
│   ├── utils/                # 工具函数
│   ├── types/                # TypeScript 类型
│   ├── assets/               # 静态资源
│   │   ├── images/
│   │   ├── icons/
│   │   └── styles/
│   ├── api/                  # API 接口
│   ├── App.vue               # 根组件
│   └── main.ts               # 应用入口
├── public/                   # 公共静态资源
├── cypress/                  # E2E 测试
├── stories/                  # Storybook 故事
├── .env.local                # 环境变量
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
├── vitest.config.ts         # Vitest 配置
└── package.json             # 项目配置
```

## 核心配置

### 1. Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { viteMockServe } from 'vite-plugin-mock'

export default defineConfig({
  plugins: [
    vue(),
    createSvgIconsPlugin({
      iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
      symbolId: 'icon-[dir]-[name]'
    }),
    viteMockServe({
      mockPath: 'mock',
      enable: true
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/views': resolve(__dirname, 'src/views'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/stores': resolve(__dirname, 'src/stores'),
      '@/api': resolve(__dirname, 'src/api')
    }
  },
  server: {
    port: 3000,
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: '[ext]/[name]-[hash].[ext]'
      }
    }
  }
})
```

### 2. TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/views/*": ["src/views/*"],
      "@/utils/*": ["src/utils/*"],
      "@/stores/*": ["src/stores/*"],
      "@/api/*": ["src/api/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 3. 应用入口配置

```typescript
// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import '@/assets/styles/index.scss'

const app = createApp(App)

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
```

## 核心组件

### 1. 根组件

```vue
<!-- src/App.vue -->
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

onMounted(() => {
  // 初始化用户信息
  userStore.initUser()
})
</script>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
</style>
```

### 2. 路由配置

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: {
      title: '首页',
      requiresAuth: false
    }
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue'),
    meta: {
      title: '关于',
      requiresAuth: false
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: {
      title: '仪表板',
      requiresAuth: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - {{projectName}}`
  }

  // 检查认证
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

export default router
```

### 3. 状态管理

```typescript
// src/stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/user'

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  // 计算属性
  const isAuthenticated = computed(() => !!token.value)
  const userInfo = computed(() => user.value)

  // 方法
  const setUser = (userData: User) => {
    user.value = userData
  }

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  const initUser = async () => {
    if (token.value) {
      try {
        const userData = await fetchUserInfo()
        setUser(userData)
      } catch (error) {
        logout()
      }
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    userInfo,
    setUser,
    setToken,
    logout,
    initUser
  }
})
```

### 4. 组合式函数

```typescript
// src/composables/useApi.ts
import { ref, type Ref } from 'vue'
import axios from 'axios'

interface UseApiOptions {
  immediate?: boolean
}

export function useApi<T>(url: string, options: UseApiOptions = {}) {
  const data: Ref<T | null> = ref(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const execute = async (params?: any) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get(url, { params })
      data.value = response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '请求失败'
    } finally {
      loading.value = false
    }
  }

  if (options.immediate) {
    execute()
  }

  return {
    data,
    loading,
    error,
    execute
  }
}
```

### 5. 业务组件示例

```vue
<!-- src/components/business/UserCard.vue -->
<template>
  <el-card class="user-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <span>{{ user.name }}</span>
        <el-tag :type="user.role === 'admin' ? 'danger' : 'primary'">
          {{ user.role }}
        </el-tag>
      </div>
    </template>

    <div class="user-info">
      <el-avatar :size="60" :src="user.avatar" />
      <div class="info-details">
        <p><strong>邮箱:</strong> {{ user.email }}</p>
        <p><strong>部门:</strong> {{ user.department }}</p>
        <p><strong>入职时间:</strong> {{ formatDate(user.joinDate) }}</p>
      </div>
    </div>

    <template #footer>
      <el-button type="primary" @click="handleEdit">编辑</el-button>
      <el-button type="danger" @click="handleDelete">删除</el-button>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '@/types/user'
import { formatDate } from '@/utils/date'

interface Props {
  user: User
}

interface Emits {
  (e: 'edit', user: User): void
  (e: 'delete', user: User): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleEdit = () => {
  emit('edit', props.user)
}

const handleDelete = () => {
  emit('delete', props.user)
}
</script>

<style lang="scss" scoped>
.user-card {
  margin-bottom: 16px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 16px;

    .info-details {
      flex: 1;

      p {
        margin: 4px 0;
        font-size: 14px;
      }
    }
  }
}
</style>
```

## 开发工具配置

### 1. Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

### 2. Cypress 配置

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720
  },
  component: {
    devServer: {
      framework: 'vue',
      bundler: 'vite'
    }
  }
})
```

### 3. Storybook 配置

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/vue3'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions', '@storybook/addon-links'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  }
}

export default config
```

## 最佳实践

### 1. 组件设计模式

```vue
<!-- 使用 Composition API 和 <script setup> -->
<template>
  <div class="counter">
    <h2>Count: {{ count }}</h2>
    <el-button @click="increment">+</el-button>
    <el-button @click="decrement">-</el-button>
    <el-button @click="reset">Reset</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Props 定义
interface Props {
  initialValue?: number
  max?: number
  min?: number
}

const props = withDefaults(defineProps<Props>(), {
  initialValue: 0,
  max: 100,
  min: 0
})

// Emits 定义
interface Emits {
  (e: 'change', value: number): void
  (e: 'max-reached'): void
  (e: 'min-reached'): void
}

const emit = defineEmits<Emits>()

// 响应式状态
const count = ref(props.initialValue)

// 计算属性
const isMax = computed(() => count.value >= props.max)
const isMin = computed(() => count.value <= props.min)

// 方法
const increment = () => {
  if (!isMax.value) {
    count.value++
    emit('change', count.value)
  } else {
    emit('max-reached')
  }
}

const decrement = () => {
  if (!isMin.value) {
    count.value--
    emit('change', count.value)
  } else {
    emit('min-reached')
  }
}

const reset = () => {
  count.value = props.initialValue
  emit('change', count.value)
}
</script>
```

### 2. API 接口管理

```typescript
// src/api/user.ts
import request from '@/utils/request'
import type { User, CreateUserDto, UpdateUserDto } from '@/types/user'

export const userApi = {
  // 获取用户列表
  getUsers: (params?: any) => request.get<User[]>('/users', { params }),

  // 获取用户详情
  getUser: (id: number) => request.get<User>(`/users/${id}`),

  // 创建用户
  createUser: (data: CreateUserDto) => request.post<User>('/users', data),

  // 更新用户
  updateUser: (id: number, data: UpdateUserDto) => request.put<User>(`/users/${id}`, data),

  // 删除用户
  deleteUser: (id: number) => request.delete(`/users/${id}`)
}
```

### 3. 类型定义

```typescript
// src/types/user.ts
export interface User {
  id: number
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'user' | 'guest'
  department: string
  joinDate: string
  isActive: boolean
}

export interface CreateUserDto {
  name: string
  email: string
  role: User['role']
  department: string
}

export interface UpdateUserDto extends Partial<CreateUserDto> {
  isActive?: boolean
}

export interface UserListResponse {
  users: User[]
  total: number
  page: number
  pageSize: number
}
```

## 性能优化

### 1. 组件懒加载

```typescript
// src/router/index.ts
const routes = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import(/* webpackChunkName: "dashboard" */ '@/views/Dashboard.vue')
  }
]
```

### 2. 状态管理优化

```typescript
// src/stores/index.ts
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(
  createPersistedState({
    storage: localStorage,
    key: (id) => `__persisted__${id}`
  })
)

export default pinia
```

### 3. 构建优化

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          element: ['element-plus'],
          utils: ['axios', '@vueuse/core']
        }
      }
    }
  }
})
```

## 测试策略

### 1. 单元测试

```typescript
// src/components/__tests__/UserCard.test.ts
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import UserCard from '../business/UserCard.vue'
import type { User } from '@/types/user'

const mockUser: User = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user',
  department: 'Engineering',
  joinDate: '2023-01-01',
  isActive: true
}

describe('UserCard', () => {
  it('renders user information correctly', () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser }
    })

    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('john@example.com')
    expect(wrapper.text()).toContain('Engineering')
  })

  it('emits edit event when edit button is clicked', async () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser }
    })

    await wrapper.find('[data-testid="edit-button"]').trigger('click')

    expect(wrapper.emitted('edit')).toBeTruthy()
    expect(wrapper.emitted('edit')?.[0]).toEqual([mockUser])
  })
})
```

### 2. E2E 测试

```typescript
// cypress/e2e/user-management.cy.ts
describe('User Management', () => {
  beforeEach(() => {
    cy.visit('/users')
  })

  it('should display user list', () => {
    cy.get('[data-testid="user-list"]').should('be.visible')
    cy.get('[data-testid="user-card"]').should('have.length.greaterThan', 0)
  })

  it('should create new user', () => {
    cy.get('[data-testid="add-user-button"]').click()
    cy.get('[data-testid="user-form"]').should('be.visible')

    cy.get('[data-testid="name-input"]').type('Jane Doe')
    cy.get('[data-testid="email-input"]').type('jane@example.com')
    cy.get('[data-testid="submit-button"]').click()

    cy.get('[data-testid="success-message"]').should('be.visible')
  })
})
```

## 部署配置

### 1. Docker 配置

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2. Nginx 配置

```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 总结

Imber CLI 的 Vue3 + Vite 模板提供了一个完整的现代化 Vue 开发环境：

1. **现代化技术栈**：Vue 3.4+、Vite 5+、TypeScript
2. **完整生态**：Pinia、Vue Router、Element Plus
3. **开发体验**：热重载、类型安全、调试工具
4. **测试覆盖**：单元测试、E2E 测试、组件测试
5. **性能优化**：代码分割、懒加载、构建优化

通过这个模板，开发者可以快速启动一个高质量的 Vue 项目，享受 Vue 3 的 Composition API 和现代前端开发的最佳实践。
