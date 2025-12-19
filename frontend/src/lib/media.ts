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
  
  // For /uploads paths, use backend URL directly (not /api/uploads)
  // Static files are served at /uploads on the backend
  if (path.startsWith('/uploads/')) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 
                       import.meta.env.VITE_API_URL?.replace('/api', '') || 
                       '';
    return `${backendUrl}${path}`
  }
  
  // For other paths, use API URL
  const base = import.meta.env.VITE_API_URL || ''
  return `${base}${path}`
}


