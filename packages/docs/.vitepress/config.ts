import { defineConfig } from 'vitepress'

// 环境检测：开发环境和生产环境的 URL
const isDev = process.env.NODE_ENV !== 'production'
const REACT_EXAMPLE_URL = isDev
  ? 'http://localhost:4800/'
  : 'https://wh131462.github.io/file-preview/'
const VUE_EXAMPLE_URL = isDev
  ? 'http://localhost:4802/'
  : 'https://wh131462.github.io/file-preview/vue/'

const base = '/file-preview/docs/'

export default defineConfig({
  title: 'File Preview',
  description: 'A modern, feature-rich file preview component for React & Vue 3',
  base,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}icon.svg` }],
  ],

  vite: {
    server: {
      port: 4801,
      strictPort: true,
    },
  },

  themeConfig: {
    logo: '/icon.svg',

    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API', link: '/api/components' },
      {
        text: '在线示例',
        items: [
          { text: 'React 版本', link: REACT_EXAMPLE_URL, target: '_blank' },
          { text: 'Vue 3 版本', link: VUE_EXAMPLE_URL, target: '_blank' },
        ],
      },
      {
        text: '框架',
        items: [
          { text: 'React (@eternalheart/react-file-preview)', link: 'https://www.npmjs.com/package/@eternalheart/react-file-preview', target: '_blank' },
          { text: 'Vue 3 (@eternalheart/vue-file-preview)', link: 'https://www.npmjs.com/package/@eternalheart/vue-file-preview', target: '_blank' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装', link: '/guide/installation' },
            { text: '基础用法', link: '/guide/basic-usage' }
          ]
        },
        {
          text: '功能',
          items: [
            { text: '支持的文件类型', link: '/guide/supported-types' },
            { text: '自定义渲染器', link: '/guide/custom-renderers' },
            { text: '主题定制', link: '/guide/theming' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '组件', link: '/api/components' },
            { text: '类型定义', link: '/api/types' },
            { text: '工具函数', link: '/api/utils' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/wh131462/file-preview' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-2026 <a href="https://github.com/wh131462" target="_blank">EternalHeart</a>'
    },

    search: {
      provider: 'local'
    }
  }
})
