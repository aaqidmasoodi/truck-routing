// Debug logs show up in development, or in a build made with VITE_DEBUG=true.
export const debugEnabled = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true'

export function debug(scope: string, ...details: unknown[]): void {
  if (debugEnabled) console.debug(`[${scope}]`, ...details)
}
