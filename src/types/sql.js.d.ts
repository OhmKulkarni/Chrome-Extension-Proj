declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: {
      new (data?: Uint8Array): Database;
    };
  }
  export interface Database {
    run(sql: string): void;
    exec(sql: string): any;
    close(): void;
    // Add more methods as needed
  }
  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
    wasmBinary?: ArrayBuffer;
  }): Promise<SqlJsStatic>;
}

declare module 'sql.js/dist/sql-wasm.js';
