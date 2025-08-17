import { useState, useEffect } from 'react'
import IconSelector from '../components/IconSelector'
import { initDB, addHabit, getAllHabits, updateHabit, deleteHabit, updateHabitsOrder } from '../utils/indexedDB'
import { AVAILABLE_ICONS } from '../constants/icons'

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
  const [draggedHabit, setDraggedHabit] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  useEffect(() => {
    loadHabits()
  }, [])

  const loadHabits = async () => {
    try {
      await initDB()
      const habitsData = await getAllHabits()
      console.log('🏠 Habits page loaded habits:', habitsData.map(h => ({ name: h.name, sortOrder: h.sortOrder })))
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
      setFormData({ name: '', description: '', icon: 'fitness_center' })
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
      setEditFormData({ name: '', description: '', icon: 'fitness_center' })
    } catch (error) {
      console.error('Error updating habit:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingHabit(null)
    setEditFormData({ name: '', description: '', icon: 'fitness_center' })
  }

  const handleDragStart = (e, habit, index) => {
    setDraggedHabit({ habit, index })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.target)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = (e) => {
    setDragOverIndex(null)
  }

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault()
    setDragOverIndex(null)
    
    if (!draggedHabit || draggedHabit.index === dropIndex) {
      setDraggedHabit(null)
      return
    }

    console.log(`🎯 Dropping habit from index ${draggedHabit.index} to ${dropIndex}`)
    console.log('📋 Current habits before reorder:', habits.map((h, i) => `${i}: ${h.name} (${h.sortOrder})`))

    try {
      const newHabits = [...habits]
      const [draggedItem] = newHabits.splice(draggedHabit.index, 1)
      newHabits.splice(dropIndex, 0, draggedItem)
      
      console.log('🔄 New order after drag:', newHabits.map((h, i) => `${i}: ${h.name}`))
      
      // Update UI immediately
      setHabits(newHabits)
      console.log('💾 Saving new order to database...')
      
      await updateHabitsOrder(newHabits)
      setDraggedHabit(null)
      console.log('✅ Drag completed successfully')
      
      // Reload to verify persistence
      console.log('🔍 Reloading to verify persistence...')
      setTimeout(() => {
        loadHabits()
      }, 500)
    } catch (error) {
      console.error('❌ Error reordering habits:', error)
      // Reload habits if reordering fails
      loadHabits()
    }
  }

  const handleDragEnd = () => {
    setDraggedHabit(null)
    setDragOverIndex(null)
  }

  const moveHabit = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return
    
    console.log(`Moving habit from index ${fromIndex} to ${toIndex}`)
    
    try {
      const newHabits = [...habits]
      const [movedItem] = newHabits.splice(fromIndex, 1)
      newHabits.splice(toIndex, 0, movedItem)
      
      console.log('New order:', newHabits.map(h => h.name))
      
      setHabits(newHabits)
      await updateHabitsOrder(newHabits)
      console.log('Move completed successfully')
    } catch (error) {
      console.error('Error reordering habits:', error)
      loadHabits()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      
      <div className="card p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-3xl flex items-center justify-center">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-medium text-neutral-900">Create New Habit</h2>
            <p className="text-neutral-600 text-sm sm:text-base">Add a new habit to start building consistency</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="max-w-2xl">
          <div className="space-y-4 sm:space-y-5">
            {/* Icon + Title Row */}
            <div className="flex gap-3 sm:gap-4 items-start">
              <div className="flex-shrink-0">
                <IconSelector 
                  selectedIcon={formData.icon}
                  onIconSelect={(icon) => setFormData(prev => ({ ...prev, icon }))}
                />
              </div>
              <div className="flex-1 space-y-4 sm:space-y-5">
                <input 
                  type="text" 
                  placeholder="Habit name (e.g., Read for 20 minutes)"
                  className="input-field w-full text-base"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
                
                <textarea 
                  placeholder="Description (optional)"
                  className="input-field w-full h-16 sm:h-20 resize-none text-base"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
                
                <div className="flex justify-start">
                  <button 
                    type="submit" 
                    className="btn-primary px-8 py-3 text-base font-medium"
                  >
                    Add Habit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
      
      <div className="card p-4 sm:p-6 lg:p-8">
        <h3 className="text-xl sm:text-2xl font-medium text-neutral-900 mb-4 sm:mb-6">Your Habits</h3>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-neutral-500">Loading habits...</p>
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-neutral-100 rounded-4xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-neutral-500 text-base sm:text-lg">No habits created yet</p>
            <p className="text-neutral-400 text-sm sm:text-base">Use the form above to add your first habit</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {habits.map((habit, index) => (
              <div 
                key={habit.id} 
                draggable={editingHabit !== habit.id}
                onDragStart={(e) => handleDragStart(e, habit, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`border rounded-2xl p-4 sm:p-6 transition-all ${
                  dragOverIndex === index 
                    ? 'border-primary-300 bg-primary-50 border-2' 
                    : draggedHabit?.index === index
                      ? 'border-neutral-300 bg-neutral-100 opacity-50'
                      : 'border-neutral-200'
                } ${editingHabit !== habit.id ? 'cursor-move' : ''}`}
              >
                {editingHabit === habit.id ? (
                  <div className="max-w-2xl">
                    <div className="space-y-4 sm:space-y-5">
                      {/* Icon + Form Content */}
                      <div className="flex gap-3 sm:gap-4 items-start">
                        <div className="flex-shrink-0">
                          <IconSelector 
                            selectedIcon={editFormData.icon}
                            onIconSelect={(icon) => setEditFormData(prev => ({ ...prev, icon }))}
                          />
                        </div>
                        <div className="flex-1 space-y-4 sm:space-y-5">
                          <input 
                            type="text" 
                            placeholder="Habit name"
                            className="input-field w-full text-base"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                          />
                          
                          <textarea 
                            placeholder="Description (optional)"
                            className="input-field w-full h-16 sm:h-20 resize-none text-base"
                            value={editFormData.description}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                          />
                          
                          <div className="flex flex-col sm:flex-row gap-3 sm:justify-start">
                            <button
                              onClick={() => handleSaveEdit(habit.id)}
                              className="btn-primary px-8 py-3 text-base font-medium"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-4 py-3 text-neutral-600 hover:text-neutral-800 transition-colors text-base"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {/* Content Row */}
                    <div className="flex items-start justify-between mb-3 sm:mb-0">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                        {/* Drag Handle - Hidden on mobile */}
                        <div className="hidden sm:flex flex-col items-center gap-1 pt-1 cursor-move" title="Drag to reorder">
                          <div className="w-1 h-1 bg-neutral-400 rounded-full"></div>
                          <div className="w-1 h-1 bg-neutral-400 rounded-full"></div>
                          <div className="w-1 h-1 bg-neutral-400 rounded-full"></div>
                          <div className="w-1 h-1 bg-neutral-400 rounded-full"></div>
                          <div className="w-1 h-1 bg-neutral-400 rounded-full"></div>
                          <div className="w-1 h-1 bg-neutral-400 rounded-full"></div>
                        </div>
                        
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-3xl flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-primary-600 text-xl sm:text-2xl">
                            {AVAILABLE_ICONS.find(icon => icon.id === habit.icon)?.id || 'fitness_center'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg sm:text-xl font-medium text-neutral-900 mb-1 truncate">{habit.name}</h4>
                          {habit.description && (
                            <p className="text-neutral-600 text-sm sm:text-base line-clamp-2">{habit.description}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Desktop: Action buttons on the right */}
                      <div className="hidden sm:flex gap-1 flex-shrink-0 ml-2">
                        {/* Reorder Buttons */}
                        <button
                          onClick={() => moveHabit(index, Math.max(0, index - 1))}
                          disabled={index === 0}
                          className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                            index === 0
                              ? 'text-neutral-300 cursor-not-allowed'
                              : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100'
                          }`}
                          title="Move up"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveHabit(index, Math.min(habits.length - 1, index + 1))}
                          disabled={index === habits.length - 1}
                          className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                            index === habits.length - 1
                              ? 'text-neutral-300 cursor-not-allowed'
                              : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100'
                          }`}
                          title="Move down"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        <div className="w-px bg-neutral-200 mx-1"></div>
                        
                        {/* Edit/Delete Buttons */}
                        <button
                          onClick={() => handleEditHabit(habit)}
                          className="text-neutral-400 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-neutral-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Edit habit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => confirmDelete(habit)}
                          className="text-neutral-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-neutral-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Delete habit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Mobile: Action buttons at bottom in horizontal row */}
                    <div className="sm:hidden flex justify-center gap-1 pt-3 border-t border-neutral-100">
                      {/* Reorder Buttons */}
                      <button
                        onClick={() => moveHabit(index, Math.max(0, index - 1))}
                        disabled={index === 0}
                        className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-1 max-w-[80px] ${
                          index === 0
                            ? 'text-neutral-300 cursor-not-allowed'
                            : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100'
                        }`}
                        title="Move up"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveHabit(index, Math.min(habits.length - 1, index + 1))}
                        disabled={index === habits.length - 1}
                        className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-1 max-w-[80px] ${
                          index === habits.length - 1
                            ? 'text-neutral-300 cursor-not-allowed'
                            : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100'
                        }`}
                        title="Move down"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      <div className="w-px bg-neutral-200 mx-2"></div>
                      
                      {/* Edit/Delete Buttons */}
                      <button
                        onClick={() => handleEditHabit(habit)}
                        className="text-neutral-400 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-neutral-100 min-h-[44px] min-w-[44px] flex items-center justify-center flex-1 max-w-[80px]"
                        title="Edit habit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => confirmDelete(habit)}
                        className="text-neutral-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-neutral-100 min-h-[44px] min-w-[44px] flex items-center justify-center flex-1 max-w-[80px]"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-medium text-neutral-900">Delete Habit</h3>
                <p className="text-neutral-600 text-sm sm:text-base">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-neutral-700 text-sm sm:text-base">
                Are you sure you want to delete <strong>"{deleteConfirm.name}"</strong>? 
                All progress and data for this habit will be permanently lost.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-3 sm:py-2 text-neutral-600 hover:text-neutral-800 transition-colors text-base order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="px-4 py-3 sm:py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium text-base order-1 sm:order-2"
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