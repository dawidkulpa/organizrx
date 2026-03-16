declare module 'fs' {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined
  export function readdirSync(path: string): string[]
  export function readFileSync(path: string, encoding: string): string
  export function rmSync(path: string, options?: { force?: boolean; recursive?: boolean }): void
}

declare module 'node:fs' {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined
  export function readdirSync(path: string): string[]
  export function readFileSync(path: string, encoding: string): string
  export function rmSync(path: string, options?: { force?: boolean; recursive?: boolean }): void
}

declare module 'path' {
  export function resolve(...paths: string[]): string
}

declare module 'node:path' {
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

declare const process: {
  cwd(): string
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
  write(path: string, data: string): Promise<number>
}
