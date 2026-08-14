declare module 'x-data-spreadsheet' {
  export default class Spreadsheet {
    constructor(container: HTMLElement, options?: Record<string, unknown>);
    loadData(data: Record<string, unknown> | Record<string, unknown>[]): this;
  }
}
