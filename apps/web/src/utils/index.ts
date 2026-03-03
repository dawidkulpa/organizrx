import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Form resolver wrapper ───────────────────────────────────────────────────
// Works around deep type incompatibility between @hookform/resolvers/zod and zod v4.
// This eliminates `as any` at call sites while keeping full type safety for form data.
import type { Resolver, FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- bridge Zod v4 ↔ @hookform/resolvers type gap
export function typedZodResolver<T extends FieldValues>(schema: unknown): Resolver<T> {
  return zodResolver(schema as Parameters<typeof zodResolver>[0]) as unknown as Resolver<T>
}