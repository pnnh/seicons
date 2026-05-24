// Minimal D1 typings + CloudflareEnv augmentation
// Provides types for Cloudflare D1 database binding used by icons-db.ts.

declare global {
  interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    meta: unknown;
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run<T = unknown>(): Promise<D1Result<T>>;
    all<T = unknown>(): Promise<D1Result<T>>;
    raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec(query: string): Promise<{ count: number; duration: number }>;
  }

  // Augment the CloudflareEnv interface (declared by @opennextjs/cloudflare)
  // with the project's D1 database binding.
  interface CloudflareEnv {
    DB: D1Database;
  }
}

export {};
