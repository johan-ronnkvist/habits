import { useState } from 'react'

const AVAILABLE_ICONS = [
  // Health & Fitness
  { id: 'fitness_center', name: 'Exercise' },
  { id: 'directions_run', name: 'Running' },
  { id: 'local_drink', name: 'Water' },
  { id: 'favorite', name: 'Health' },
  { id: 'self_improvement', name: 'Yoga' },
  { id: 'medication', name: 'Medicine' },

  // Mental & Learning
  { id: 'menu_book', name: 'Reading' },
  { id: 'psychology', name: 'Learning' },
  { id: 'spa', name: 'Meditation' },
  { id: 'edit_note', name: 'Journaling' },

  // Lifestyle & Productivity
  { id: 'bedtime', name: 'Sleep' },
  { id: 'wb_sunny', name: 'Morning' },
  { id: 'local_cafe', name: 'Coffee' },
  { id: 'cleaning_services', name: 'Cleaning' },
  { id: 'attach_money', name: 'Finance' },
  { id: 'work', name: 'Work' },

  // Creative & Hobbies
  { id: 'library_music', name: 'Music' },
  { id: 'palette', name: 'Art' },
  { id: 'restaurant', name: 'Cooking' },
  { id: 'eco', name: 'Gardening' },

  // Social & Digital
  { id: 'phone_disabled', name: 'Phone Limit' },
  { id: 'groups', name: 'Socializing' },
  { id: 'church', name: 'Prayer' },

  // Goals & Tracking
  { id: 'grade', name: 'Goals' },
  { id: 'gps_fixed', name: 'Practice' },
  { id: 'task_alt', name: 'Task' }
]

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