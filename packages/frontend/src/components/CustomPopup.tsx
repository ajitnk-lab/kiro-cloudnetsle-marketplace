import { useState, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

interface PopupProps {
  message: string
  type?: 'success' | 'error' | 'info'
  isOpen: boolean
  onClose: () => void
  autoClose?: boolean
  duration?: number
}

export function CustomPopup({ 
  message, 
  type = 'info', 
  isOpen, 
  onClose, 
  autoClose = true, 
  duration = 3000 
}: PopupProps) {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [isOpen, autoClose, duration, onClose])

  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'error': return <AlertCircle className="w-6 h-6 text-red-500" />
      default: return <Info className="w-6 h-6 text-blue-500" />
    }
  }

  const getBgColor = () => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200'
      case 'error': return 'bg-red-50 border-red-200'
      default: return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`max-w-md w-full mx-4 p-6 rounded-lg border-2 shadow-lg ${getBgColor()}`}>
        <div className="flex items-start space-x-3">
          {getIcon()}
          <div className="flex-1">
            <p className="text-gray-800 font-medium">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook for easy popup management
export function usePopup() {
  const [popup, setPopup] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
    isOpen: boolean
  }>({
    message: '',
    type: 'info',
    isOpen: false
  })

  const showPopup = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setPopup({ message, type, isOpen: true })
  }

  const closePopup = () => {
    setPopup(prev => ({ ...prev, isOpen: false }))
  }

  return { popup, showPopup, closePopup }
}
