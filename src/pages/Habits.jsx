import { useState, useEffect } from 'react'
import IconSelector from '../components/IconSelector'
import { initDB, addHabit, getAllHabits, updateHabit, deleteHabit } from '../utils/indexedDB'

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

function Habits() {
  const [habits, setHabits] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'fitness_center'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [editingHabit, setEditingHabit] = useState(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    icon: 'fitness_center'
  })
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    loadHabits()
  }, [])

  const loadHabits = async () => {
    try {
      await initDB()
      const habitsData = await getAllHabits()
      setHabits(habitsData)
    } catch (error) {
      console.error('Error loading habits:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      const newHabit = await addHabit(formData)
      setHabits(prev => [...prev, newHabit])
      setFormData({ name: '', description: '', icon: 'fitness' })
    } catch (error) {
      console.error('Error adding habit:', error)
    }
  }

  const handleDelete = async (habitId) => {
    try {
      await deleteHabit(habitId)
      setHabits(prev => prev.filter(habit => habit.id !== habitId))
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting habit:', error)
    }
  }

  const confirmDelete = (habit) => {
    setDeleteConfirm(habit)
  }

  const cancelDelete = () => {
    setDeleteConfirm(null)
  }


  const handleEditHabit = (habit) => {
    setEditingHabit(habit.id)
    setEditFormData({
      name: habit.name,
      description: habit.description || '',
      icon: habit.icon
    })
  }

  const handleSaveEdit = async (habitId) => {
    if (!editFormData.name.trim()) return

    try {
      const updatedHabit = await updateHabit(habitId, editFormData)
      setHabits(prev => prev.map(habit => 
        habit.id === habitId ? updatedHabit : habit
      ))
      setEditingHabit(null)
      setEditFormData({ name: '', description: '', icon: 'fitness' })
    } catch (error) {
      console.error('Error updating habit:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingHabit(null)
    setEditFormData({ name: '', description: '', icon: 'fitness' })
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-neutral-900 mb-2">Habits</h1>
        <p className="text-neutral-600 text-lg">Create and manage your daily routines</p>
      </div>
      
      <div className="card p-8 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-primary-100 rounded-3xl flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-medium text-neutral-900">Create New Habit</h2>
            <p className="text-neutral-600">Add a new habit to start building consistency</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 items-start">
            <IconSelector 
              selectedIcon={formData.icon}
              onIconSelect={(icon) => setFormData(prev => ({ ...prev, icon }))}
            />
            <div className="flex-1 space-y-4">
              <input 
                type="text" 
                placeholder="Habit name (e.g., Read for 20 minutes)"
                className="input-field w-full"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
              <textarea 
                placeholder="Description (optional)"
                className="input-field w-full h-20 resize-none"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn-primary">
              Add Habit
            </button>
          </div>
        </form>
      </div>
      
      <div className="card p-8">
        <h3 className="text-2xl font-medium text-neutral-900 mb-6">Your Habits</h3>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-neutral-500">Loading habits...</p>
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-100 rounded-4xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-neutral-500 text-lg">No habits created yet</p>
            <p className="text-neutral-400">Use the form above to add your first habit</p>
          </div>
        ) : (
          <div className="space-y-4">
            {habits.map((habit) => (
              <div key={habit.id} className="border border-neutral-200 rounded-2xl p-6">
                {editingHabit === habit.id ? (
                  <div className="space-y-4">
                    <div className="flex gap-4 items-start">
                      <IconSelector 
                        selectedIcon={editFormData.icon}
                        onIconSelect={(icon) => setEditFormData(prev => ({ ...prev, icon }))}
                      />
                      <div className="flex-1 space-y-4">
                        <input 
                          type="text" 
                          placeholder="Habit name"
                          className="input-field w-full"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <textarea 
                          placeholder="Description (optional)"
                          className="input-field w-full h-20 resize-none"
                          value={editFormData.description}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 text-neutral-600 hover:text-neutral-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(habit.id)}
                        className="btn-primary"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-primary-100 rounded-3xl flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary-600 text-2xl">
                          {AVAILABLE_ICONS.find(icon => icon.id === habit.icon)?.id || AVAILABLE_ICONS[0].id}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-medium text-neutral-900 mb-1">{habit.name}</h4>
                        {habit.description && (
                          <p className="text-neutral-600">{habit.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditHabit(habit)}
                        className="text-neutral-400 hover:text-blue-500 transition-colors p-2"
                        title="Edit habit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => confirmDelete(habit)}
                        className="text-neutral-400 hover:text-red-500 transition-colors p-2"
                        title="Delete habit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-medium text-neutral-900">Delete Habit</h3>
                <p className="text-neutral-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-neutral-700">
                Are you sure you want to delete <strong>"{deleteConfirm.name}"</strong>? 
                All progress and data for this habit will be permanently lost.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-neutral-600 hover:text-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
              >
                Delete Habit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Habits