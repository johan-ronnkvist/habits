import { useState } from 'react'
import { AVAILABLE_ICONS } from '../constants/icons'

function IconSelector({ selectedIcon, onIconSelect, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedIconData = AVAILABLE_ICONS.find(icon => icon.id === selectedIcon) || AVAILABLE_ICONS[0]

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-primary-100 hover:bg-primary-200 rounded-3xl flex items-center justify-center transition-colors"
      >
        <span className="material-symbols-outlined text-primary-600 text-2xl">
          {selectedIconData.id}
        </span>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-lg border border-neutral-200 p-4 z-20 grid grid-cols-6 gap-2 min-w-80 max-h-80 overflow-y-auto">
            {AVAILABLE_ICONS.map((icon) => (
              <button
                key={icon.id}
                type="button"
                onClick={() => {
                  onIconSelect(icon.id)
                  setIsOpen(false)
                }}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  selectedIcon === icon.id 
                    ? 'bg-primary-100 text-primary-600' 
                    : 'hover:bg-neutral-100 text-neutral-600'
                }`}
                title={icon.name}
              >
                <span className="material-symbols-outlined text-xl">
                  {icon.id}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default IconSelector