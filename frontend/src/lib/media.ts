export const resolveImageUrl = (path?: string | null) => {
  if (!path) return ''
  
  // If it's already a full URL (http/https), return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  // If it's a data URL, return as-is
  if (path.startsWith('data:')) {
    return path
  }
  
  // Get the API base URL from environment
  // In production build, this should be set to the production API URL
  // In development, it might be empty (relative path) or set to localhost
  const base = import.meta.env.VITE_API_URL || ''
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  
  // Return the full URL
  return `${base}${normalizedPath}`
}


