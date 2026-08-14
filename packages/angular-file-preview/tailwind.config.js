/** @type {import('tailwindcss').Config} */
export default {
  prefix: 'afp-',
  important: '.afp-root',
  corePlugins: {
    preflight: false,
  },
  content: [
    './src/**/*.{js,ts,html}',
  ],
  theme: {
    extend: {
      colors: {
        'fg-primary':         'var(--fp-fg-primary)',
        'fg-secondary':       'var(--fp-fg-secondary)',
        'fg-tertiary':        'var(--fp-fg-tertiary)',
        'fg-muted':           'var(--fp-fg-muted)',
        'fg-disabled':        'var(--fp-fg-disabled)',
        'fg-inverse':         'var(--fp-fg-inverse)',
        'surface-1':          'var(--fp-surface-1)',
        'surface-2':          'var(--fp-surface-2)',
        'surface-3':          'var(--fp-surface-3)',
        'surface-toolbar':    'var(--fp-surface-toolbar)',
        'surface-overlay':    'var(--fp-surface-overlay)',
        'surface-nav':        'var(--fp-surface-nav)',
        'surface-nav-hover':  'var(--fp-surface-nav-hover)',
        'line-weak':          'var(--fp-line-weak)',
        'line':               'var(--fp-line)',
        'line-strong':        'var(--fp-line-strong)',
        'divide':             'var(--fp-divide)',
        'accent':             'var(--fp-accent)',
        'accent-hover':       'var(--fp-accent-hover)',
        'accent-soft':        'var(--fp-accent-soft)',
        'code-bg':            'var(--fp-code-bg)',
        'code-fg':            'var(--fp-code-fg)',
        'code-header':        'var(--fp-code-header)',
        'media-bg':           'var(--fp-media-bg)',
        'spinner-track':      'var(--fp-spinner-track)',
        'spinner-head':       'var(--fp-spinner-head)',
      },
    },
  },
  plugins: [],
};
