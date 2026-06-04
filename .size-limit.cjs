// size-limit 配置：为 React / Vue 两个发布包的产物声明 gzip 上限
// 任何 PR 若使任一产物超阈值，CI 会失败。
module.exports = [
  // ---------- React 包 ----------
  {
    name: 'react: index.mjs (main entry, gzip)',
    path: 'packages/react-file-preview/lib/index.mjs',
    limit: '3 MB',
    gzip: true,
  },
  {
    name: 'react: all js (entry + chunks, gzip)',
    path: [
      'packages/react-file-preview/lib/index.mjs',
      'packages/react-file-preview/lib/chunks/*.mjs',
      'packages/react-file-preview/lib/renderers/*.mjs',
    ],
    limit: '3 MB',
    gzip: true,
  },
  {
    name: 'react: css (gzip)',
    path: 'packages/react-file-preview/lib/**/*.css',
    limit: '3 MB',
    gzip: true,
  },

  // ---------- Vue 包 ----------
  {
    name: 'vue: index.mjs (main entry, gzip)',
    path: 'packages/vue-file-preview/lib/index.mjs',
    limit: '3 MB',
    gzip: true,
  },
  {
    name: 'vue: all js (entry + chunks, gzip)',
    path: [
      'packages/vue-file-preview/lib/index.mjs',
      'packages/vue-file-preview/lib/chunks/*.mjs',
      'packages/vue-file-preview/lib/renderers/*.mjs',
    ],
    limit: '3 MB',
    gzip: true,
  },
  {
    name: 'vue: css (gzip)',
    path: 'packages/vue-file-preview/lib/**/*.css',
    limit: '3 MB',
    gzip: true,
  },
];
