import React, { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export default function EmptyState({ title, description, action }: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-gray-100 mb-4">
        <Inbox className="text-gray-400" size={32} />
      </div>
      <h3 className="text-base font-semibold text-gray-700">{title || 'No data found'}</h3>
      {description && <p className="text-sm text-gray-500 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
