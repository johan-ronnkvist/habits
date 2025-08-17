import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllHabits, setHabitState, getHabitState } from '../utils/indexedDB'
import googleDriveSync from '../utils/googleDriveSync'

function Overview() {
  const navigate = useNavigate()
  const [habits, setHabits] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const currentDayOfWeek = today.getDay()
    const mondayOffset = currentDayOfWeek === 0 ? -6 : -(currentDayOfWeek - 1)
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)
    return monday
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false)
  const [showSyncNotification, setShowSyncNotification] = useState(false)

  useEffect(() => {
    loadHabits()
    checkGoogleDriveStatus()
  }, [])

  const loadHabits = async () => {
    try {
      const habitsData = await getAllHabits()
      console.log('📊 Overview page loaded habits:', habitsData.map(h => ({ name: h.name, sortOrder: h.sortOrder })))
      setHabits(habitsData)
    } catch (error) {
      console.error('Error loading habits:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkGoogleDriveStatus = async () => {
    try {
      await googleDriveSync.init()
      const isConnected = googleDriveSync.getSignInStatus()
      setIsGoogleDriveConnected(isConnected)
    } catch (error) {
      console.log('Google Drive status check failed:', error)
      setIsGoogleDriveConnected(false)
    }
  }

  // Re-check Google Drive status when habits change
  useEffect(() => {
    const dismissedTime = localStorage.getItem('syncNotificationDismissed')
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
    
    // Show notification if:
    // - User has habits
    // - Google Drive not connected
    // - Notification wasn't dismissed today OR was dismissed more than 24 hours ago
    if (habits.length > 0 && !isGoogleDriveConnected) {
      if (!dismissedTime || parseInt(dismissedTime) < oneDayAgo) {
        setShowSyncNotification(true)
      }
    } else {
      setShowSyncNotification(false)
    }
  }, [habits, isGoogleDriveConnected])

  const dismissNotification = () => {
    setShowSyncNotification(false)
    localStorage.setItem('syncNotificationDismissed', Date.now().toString())
  }

  const goToSettings = () => {
    navigate('/settings')
  }

  const handleStateChange = async (habitId, newState) => {
    try {
      const updatedHabit = await setHabitState(habitId, selectedDate, newState)
      setHabits(prev => prev.map(habit => 
        habit.id === habitId ? updatedHabit : habit
      ))
    } catch (error) {
      console.error('Error updating habit state:', error)
    }
  }

  const getWeekDates = (weekStart = currentWeekStart) => {
    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      weekDates.push(date)
    }
    return weekDates
  }

  const navigateWeek = (direction) => {
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(currentWeekStart.getDate() + (direction * 7))
    
    // Check if the new week would be in the future
    const newWeekEnd = new Date(newWeekStart)
    newWeekEnd.setDate(newWeekStart.getDate() + 6)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Don't allow navigation if the entire week is in the future
    if (direction > 0 && newWeekStart > today) {
      return
    }
    
    setCurrentWeekStart(newWeekStart)
    
    // Update selected date if it's no longer in the visible week
    const selectedDateObj = new Date(selectedDate + 'T00:00:00')
    const newWeekDates = getWeekDates(newWeekStart)
    const isSelectedDateInNewWeek = newWeekDates.some(date => 
      formatDate(date) === selectedDate
    )
    
    if (!isSelectedDateInNewWeek) {
      // Select the first non-future date in the new week, or today if in current week
      const todayStr = today.toISOString().split('T')[0]
      const firstValidDate = newWeekDates.find(date => !isFutureDate(date))
      if (firstValidDate) {
        setSelectedDate(formatDate(firstValidDate))
      } else if (newWeekDates.some(date => formatDate(date) === todayStr)) {
        setSelectedDate(todayStr)
      }
    }
  }

  const isCurrentWeek = () => {
    const today = new Date()
    const todayWeekStart = new Date(today)
    const currentDayOfWeek = today.getDay()
    const mondayOffset = currentDayOfWeek === 0 ? -6 : -(currentDayOfWeek - 1)
    todayWeekStart.setDate(today.getDate() + mondayOffset)
    return formatDate(currentWeekStart) === formatDate(todayWeekStart)
  }

  const canNavigateNext = () => {
    const nextWeekStart = new Date(currentWeekStart)
    nextWeekStart.setDate(currentWeekStart.getDate() + 7)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return nextWeekStart <= today
  }

  const goToToday = () => {
    const today = new Date()
    const todayWeekStart = new Date(today)
    const currentDayOfWeek = today.getDay()
    const mondayOffset = currentDayOfWeek === 0 ? -6 : -(currentDayOfWeek - 1)
    todayWeekStart.setDate(today.getDate() + mondayOffset)
    
    setCurrentWeekStart(todayWeekStart)
    setSelectedDate(today.toISOString().split('T')[0])
  }

  const weekIncludesToday = () => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    return getWeekDates().some(date => formatDate(date) === todayStr)
  }

  const getDayCompletionStats = (date) => {
    if (habits.length === 0) return { completed: 0, total: 0, percentage: 0 }
    
    const dateStr = formatDate(date)
    const completed = habits.filter(habit => getHabitState(habit, dateStr) === 'completed').length
    const total = habits.length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    
    return { completed, total, percentage }
  }

  const getDayIndicatorColor = (date) => {
    const { percentage } = getDayCompletionStats(date)
    if (percentage === 0) return 'bg-neutral-200'
    if (percentage < 50) return 'bg-yellow-300'
    if (percentage < 100) return 'bg-green-300'
    return 'bg-green-500'
  }

  const formatDate = (date) => {
    return date.toISOString().split('T')[0]
  }

  const isToday = (date) => {
    const today = new Date().toISOString().split('T')[0]
    return formatDate(date) === today
  }

  const isSelectedDate = (date) => {
    return formatDate(date) === selectedDate
  }

  const isFutureDate = (date) => {
    const today = new Date().toISOString().split('T')[0]
    return formatDate(date) > today
  }

  const weekDates = getWeekDates()
  const selectedDateObj = new Date(selectedDate + 'T00:00:00')
  const isSelectedDateFuture = isFutureDate(selectedDateObj)

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      
      {/* Google Drive Sync Notification */}
      {showSyncNotification && (
        <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300">
          <div className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-lg sm:text-xl">
              cloud_sync
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-blue-900 text-sm sm:text-base">Backup Your Habits</h4>
            <p className="text-blue-700 text-xs sm:text-sm mt-1">
              Connect Google Drive to automatically backup your habit data and sync across devices.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={goToSettings}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium shadow-elevation-1"
            >
              Connect
            </button>
            <button
              onClick={dismissNotification}
              className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-2xl transition-colors"
              title="Dismiss"
            >
              <span className="material-symbols-outlined text-base">
                close
              </span>
            </button>
          </div>
        </div>
      )}
      
      {/* Weekly Habit Overview */}
      <div className="card p-4 sm:p-6 lg:p-8 mb-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          {/* Left Navigation */}
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 rounded-3xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-800 transition-all duration-300 min-h-[44px] min-w-[44px] flex items-center justify-center shadow-elevation-1 hover:shadow-elevation-2"
            title="Previous week"
          >
            <span className="material-symbols-outlined text-xl">
              chevron_left
            </span>
          </button>
          
          {/* Center Title */}
          <div className="flex-1 text-center">
            <h2 className="text-xl sm:text-2xl font-medium text-neutral-900">
              {isCurrentWeek() ? 'This Week' : 'Week of ' + currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </h2>
            {!weekIncludesToday() && (
              <button
                onClick={goToToday}
                className="mt-2 px-3 py-1 rounded-2xl bg-primary-100 hover:bg-primary-200 text-primary-700 hover:text-primary-800 transition-colors text-sm font-medium shadow-elevation-1 hover:shadow-elevation-2"
                title="Go to current week"
              >
                Today
              </button>
            )}
          </div>
          
          {/* Right Navigation */}
          <button
            onClick={() => navigateWeek(1)}
            disabled={!canNavigateNext()}
            className={`p-2 rounded-3xl transition-all duration-300 min-h-[44px] min-w-[44px] flex items-center justify-center ${
              canNavigateNext()
                ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-800 shadow-elevation-1 hover:shadow-elevation-2'
                : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'
            }`}
            title="Next week"
          >
            <span className="material-symbols-outlined text-xl">
              chevron_right
            </span>
          </button>
        </div>

        {habits.length === 0 ? (
          <div className="text-center py-12">
            <button
              onClick={() => navigate('/habits')}
              className="w-16 h-16 bg-neutral-200 hover:bg-neutral-300 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 group shadow-elevation-1 hover:shadow-elevation-2"
              title="Go to Habits page"
            >
              <span className="material-symbols-outlined text-neutral-500 group-hover:text-neutral-700 transition-colors text-3xl">
                checklist
              </span>
            </button>
            <p className="text-neutral-500 text-lg">No habits created yet</p>
            <p className="text-neutral-400">Click the icon above to add your first habit</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header Row */}
              <div className="grid gap-1 sm:gap-3 mb-2 sm:mb-4" style={{gridTemplateColumns: 'repeat(7, minmax(36px, 1fr))'}}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                  const date = getWeekDates()[index]
                  const dateStr = formatDate(date)
                  const isToday = dateStr === new Date().toISOString().split('T')[0]
                  const isSelected = dateStr === selectedDate
                  const isFuture = isFutureDate(date)
                  
                  return (
                    <button
                      key={day}
                      onClick={() => !isFuture && setSelectedDate(dateStr)}
                      disabled={isFuture}
                      className={`text-center p-0.5 sm:p-2 rounded-xl sm:rounded-2xl transition-all duration-300 w-full ${
                        isFuture
                          ? 'cursor-not-allowed opacity-50'
                          : isSelected
                            ? 'bg-primary-100 text-primary-700 shadow-elevation-1'
                            : 'hover:bg-neutral-100 hover:shadow-elevation-1'
                      }`}
                      title={isFuture ? 'Future date' : `Select ${date.toLocaleDateString()}`}
                    >
                      <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${
                        isSelected ? 'text-primary-700' : 
                        isToday ? 'text-primary-600' : 'text-neutral-700'
                      }`}>
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{day.slice(0, 1)}</span>
                        {isToday && <span className="ml-1">•</span>}
                      </div>
                      <div className={`text-xs ${
                        isSelected ? 'text-primary-600' : 'text-neutral-500'
                      }`}>
                        {date.getDate()}
                      </div>
                    </button>
                  )
                })}
              </div>
              
              {/* Habit Rows */}
              {habits.map((habit) => (
                <div key={habit.id} className="grid gap-1 sm:gap-3 mb-1 sm:mb-3" style={{gridTemplateColumns: 'repeat(7, minmax(36px, 1fr))'}}>
                  {/* Daily Status */}
                  {getWeekDates().map((date, dayIndex) => {
                    const dateStr = formatDate(date)
                    const habitState = getHabitState(habit, dateStr)
                    const isFuture = isFutureDate(date)
                    
                    return (
                      <div key={dayIndex} className="flex justify-center items-center w-full">
                        {isFuture ? (
                          <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl flex items-center justify-center bg-neutral-100">
                            <span className="text-neutral-300 text-xs sm:text-sm">−</span>
                          </div>
                        ) : habitState === 'completed' ? (
                          <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl flex items-center justify-center bg-green-100" title={`${habit.name} - Completed`}>
                            <span className="material-symbols-outlined text-green-600 text-sm sm:text-xl">
                              {habit.icon}
                            </span>
                          </div>
                        ) : habitState === 'failed' ? (
                          <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl flex items-center justify-center bg-red-100" title={`${habit.name} - Failed`}>
                            <span className="material-symbols-outlined text-red-600 text-sm sm:text-xl">
                              {habit.icon}
                            </span>
                          </div>
                        ) : (
                          <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl flex items-center justify-center bg-neutral-150" title={`${habit.name} - Not completed`}>
                            <div className="w-1.5 h-1.5 sm:w-3 sm:h-3 bg-neutral-400 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isCurrentWeek() && (
          <div className="text-center mt-4">
            <p className="text-neutral-500 text-sm">
              {currentWeekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - {getWeekDates()[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )}
      </div>


      {/* Habits for Selected Day */}
      <div className="card p-4 sm:p-6 lg:p-8">
        <h3 className="text-xl sm:text-2xl font-medium text-neutral-900 mb-4">
          Habits for {selectedDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </h3>
        
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-neutral-500">Loading habits...</p>
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <button
              onClick={() => navigate('/habits')}
              className="w-12 h-12 sm:w-16 sm:h-16 bg-neutral-200 hover:bg-neutral-300 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 transition-all duration-300 group shadow-elevation-1 hover:shadow-elevation-2"
              title="Go to Habits page"
            >
              <span className="material-symbols-outlined text-neutral-500 group-hover:text-neutral-700 transition-colors text-2xl sm:text-3xl">
                checklist
              </span>
            </button>
            <p className="text-neutral-500 text-base sm:text-lg">No habits created yet</p>
            <p className="text-neutral-400 text-sm sm:text-base">Click the icon above to add your first habit</p>
          </div>
        ) : (
          <div className="space-y-4">
            {habits.map((habit) => {
              const habitState = getHabitState(habit, selectedDate)
              
              return (
                <div key={habit.id} className="border border-neutral-200 rounded-2xl p-6 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-primary-100 rounded-3xl flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary-600 text-2xl">
                          {habit.icon}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-medium text-neutral-900 mb-1">{habit.name}</h4>
                        {habit.description && (
                          <p className="text-neutral-600">{habit.description}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* State Controls */}
                    <div className="flex items-center gap-2">
                      {isSelectedDateFuture ? (
                        <div className="text-neutral-400 text-sm px-4 py-2">
                          Future dates cannot be edited
                        </div>
                      ) : habitState !== 'none' ? (
                        <button
                          onClick={() => handleStateChange(habit.id, 'none')}
                          className="p-3 rounded-2xl bg-neutral-100 text-neutral-400 hover:bg-neutral-200 transition-all duration-300 shadow-elevation-1 hover:shadow-elevation-2"
                          title="Clear state"
                        >
                          <span className="material-symbols-outlined text-xl">
                            clear
                          </span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStateChange(habit.id, 'completed')}
                            className="p-3 rounded-2xl bg-neutral-100 text-neutral-400 hover:bg-green-100 hover:text-green-600 transition-all duration-300 shadow-elevation-1 hover:shadow-elevation-2"
                            title="Mark as completed"
                          >
                            <span className="material-symbols-outlined text-xl">
                              check
                            </span>
                          </button>
                          
                          <button
                            onClick={() => handleStateChange(habit.id, 'failed')}
                            className="p-3 rounded-2xl bg-neutral-100 text-neutral-400 hover:bg-red-100 hover:text-red-600 transition-all duration-300 shadow-elevation-1 hover:shadow-elevation-2"
                            title="Mark as failed"
                          >
                            <span className="material-symbols-outlined text-xl">
                              close
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {habitState !== 'none' && (
                    <div className={`mt-4 px-4 py-2 rounded-2xl text-sm font-medium ${
                      habitState === 'completed' 
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {habitState === 'completed' ? '✓ Completed' : '✗ Failed'} on {selectedDateObj.toLocaleDateString()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Overview