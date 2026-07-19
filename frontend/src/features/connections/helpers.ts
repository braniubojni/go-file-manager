export function isAuthErrorMessage(msg: string): boolean {
  const m = msg.toLowerCase()
  return (
    m.includes('authentication required') ||
    m.includes('unable to authenticate') ||
    m.includes('no authentication methods') ||
    m.includes('permission denied') ||
    m.includes('auth')
  )
}
