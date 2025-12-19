export const resolveImageUrl = (path?: string | null) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const base = import.meta.env.VITE_API_URL || ''
  return `${base}${path}`
}


