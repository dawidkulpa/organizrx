declare module 'fs' {
  export function existsSync(path: string): boolean
  export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined
  export function readFileSync(path: string, encoding: string): string
  export function rmSync(path: string): void
}

declare module 'path' {
  export function resolve(...paths: string[]): string
}

declare module 'bun:sqlite' {
  export class Database {
    constructor(filename: string)
    close(): void
    run(sql: string): unknown
    prepare(sql: string): {
      run(...params: unknown[]): unknown
    }
  }
}

declare const Bun: {
  password: {
    hash(
      password: string,
      options: {
        algorithm: 'bcrypt'
        cost: number
      }
    ): Promise<string>
  }
}

declare const process: {
  cwd(): string
}
