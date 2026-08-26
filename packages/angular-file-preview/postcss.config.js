export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    'postcss-prefix-selector': {
      prefix: '.afp-root',
      transform(prefix, selector, prefixedSelector) {
        if (selector.includes('.afp-root')) return selector;

        if (selector === ':root') return prefix;

        if (selector === 'body') return prefix;

        if (selector.startsWith('body.vjs-') || selector.startsWith('.vjs-full-window')) return selector;

        if (selector.startsWith('body ')) return prefix + ' ' + selector.slice(5);
        if (selector.startsWith('body.')) return prefix + selector.slice(4);

        return prefixedSelector;
      },
    },
  },
};
