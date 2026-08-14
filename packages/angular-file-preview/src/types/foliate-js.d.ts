declare module 'foliate-js/view.js' {
  const _default: unknown;
  export default _default;
}

declare module 'foliate-js/mobi.js' {
  export const isMOBI: (file: Blob | File) => Promise<boolean>;
}
