import type { RendererState, RendererAction } from './types';

/**
 * 渲染器状态初始值
 */
export const initialRendererState: RendererState = {
  common: {
    zoom: 1,
    rotation: 0,
  },
  image: {
    naturalWidth: 0,
    naturalHeight: 0,
    resetKey: 0,
  },
  pdf: {
    currentPage: 1,
    totalPages: 0,
    showOutline: false,
  },
  epub: {
    current: 0,
    total: 0,
    fullWidth: false,
  },
  mobi: {
    current: 0,
    total: 0,
    fullWidth: false,
  },
  zip: {
    stats: null,
  },
  text: {
    wordWrap: true,
    htmlPreview: false,
  },
  markdown: {
    viewMode: 'preview',
  },
};

/**
 * 渲染器状态 reducer
 */
export function rendererReducer(state: RendererState, action: RendererAction): RendererState {
  switch (action.type) {
    case 'RESET':
      return initialRendererState;

    case 'SET_ZOOM':
      return {
        ...state,
        common: { ...state.common, zoom: action.payload },
      };

    case 'SET_ROTATION':
      return {
        ...state,
        common: { ...state.common, rotation: action.payload },
      };

    case 'SET_IMAGE_NATURAL_SIZE':
      return {
        ...state,
        image: {
          ...state.image,
          naturalWidth: action.payload.width,
          naturalHeight: action.payload.height,
        },
      };

    case 'RESET_IMAGE':
      return {
        ...state,
        common: { ...state.common, zoom: 1, rotation: 0 },
        image: { ...state.image, resetKey: state.image.resetKey + 1 },
      };

    case 'SET_PDF_PAGE':
      return {
        ...state,
        pdf: { ...state.pdf, currentPage: action.payload },
      };

    case 'SET_PDF_TOTAL_PAGES':
      return {
        ...state,
        pdf: { ...state.pdf, totalPages: action.payload },
      };

    case 'SET_PDF_OUTLINE':
      return {
        ...state,
        pdf: { ...state.pdf, showOutline: action.payload },
      };

    case 'SET_EPUB_CHAPTER':
      return {
        ...state,
        epub: {
          ...state.epub,
          current: action.payload.current,
          total: action.payload.total,
        },
      };

    case 'SET_EPUB_FULL_WIDTH':
      return {
        ...state,
        epub: { ...state.epub, fullWidth: action.payload },
      };

    case 'SET_MOBI_CHAPTER':
      return {
        ...state,
        mobi: {
          ...state.mobi,
          current: action.payload.current,
          total: action.payload.total,
        },
      };

    case 'SET_MOBI_FULL_WIDTH':
      return {
        ...state,
        mobi: { ...state.mobi, fullWidth: action.payload },
      };

    case 'SET_ZIP_STATS':
      return {
        ...state,
        zip: { stats: action.payload },
      };

    case 'SET_TEXT_WORD_WRAP':
      return {
        ...state,
        text: { ...state.text, wordWrap: action.payload },
      };

    case 'SET_TEXT_HTML_PREVIEW':
      return {
        ...state,
        text: { ...state.text, htmlPreview: action.payload },
      };

    case 'SET_MARKDOWN_VIEW_MODE':
      return {
        ...state,
        markdown: { viewMode: action.payload },
      };

    default:
      return state;
  }
}
