export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    'postcss-prefix-selector': {
      prefix: '.vfp-root',
      transform(prefix, selector, prefixedSelector) {
        if (selector.includes('.vfp-root')) return selector;

        if (selector === ':root') return prefix;

        if (selector === 'body') return prefix;

        // 保留 video.js 全屏模式的 body 选择器
        if (selector.startsWith('body.vjs-') || selector.startsWith('.vjs-full-window')) return selector;

        if (selector.startsWith('body ')) return prefix + ' ' + selector.slice(5);
        if (selector.startsWith('body.')) return prefix + selector.slice(4);

        return prefixedSelector;
      },
    },
  },
};
