import React from 'react'

export default function LoadingSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const s = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <div className={`animate-spin rounded-full border-2 border-gray-200 border-t-primary-600 ${s[size]}`} />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  )
}
