declare module 'x-data-spreadsheet' {
  interface SpreadsheetOptions {
    mode?: string;
    showToolbar?: boolean;
    showContextmenu?: boolean;
    showGrid?: boolean;
    row?: { len?: number; height?: number };
    col?: { len?: number; width?: number; indexWidth?: number; minWidth?: number };
    view?: { height: () => number; width: () => number };
  }

  export default class Spreadsheet {
    constructor(container: HTMLElement, options?: SpreadsheetOptions);
    loadData(data: Record<string, unknown> | Record<string, unknown>[]): this;
  }
}
