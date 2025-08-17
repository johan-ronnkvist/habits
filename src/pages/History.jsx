import { useState, useEffect } from 'react'
import { getAllHabits, getHabitState } from '../utils/indexedDB'

function History() {
  const [habits, setHabits] = useState([])
  const [selectedHabit, setSelectedHabit] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadHabits()
  }, [])

  const loadHabits = async () => {
    try {
      const habitsData = await getAllHabits()
      console.log('📈 History page loaded habits:', habitsData.map(h => ({ name: h.name, sortOrder: h.sortOrder })))
      setHabits(habitsData)
      if (habitsData.length > 0 && !selectedHabit) {
        setSelectedHabit(habitsData[0])
      }
    } catch (error) {
      console.error('Error loading habits:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(currentMonth.getMonth() + direction)
    setCurrentMonth(newMonth)
  }

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date())
  }

  const isCurrentMonth = () => {
    const now = new Date()
    return currentMonth.getMonth() === now.getMonth() && 
           currentMonth.getFullYear() === now.getFullYear()
  }

  const getMonthDates = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    // Get first day of month and find which day of week it starts on
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    
    // Start from Monday of the week containing the first day
    const firstDayOfWeek = firstDay.getDay()
    const mondayOffset = firstDayOfWeek === 0 ? -6 : -(firstDayOfWeek - 1)
    startDate.setDate(firstDay.getDate() + mondayOffset)
    
    // Generate all dates for the calendar grid (6 weeks = 42 days)
    const dates = []
    const currentDate = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return dates
  }

  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const isInCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth()
  }

  const isToday = (date) => {
    const today = new Date()
    return formatDate(date) === formatDate(today)
  }

  const isFutureDate = (date) => {
    const today = new Date()
    return formatDate(date) > formatDate(today)
  }

  const monthDates = getMonthDates()
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-5xl mx-auto p-6">
      
      {/* Monthly Overview */}
      <div className="card p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-3xl font-bold text-primary-600">
              {monthName}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isCurrentMonth() && (
              <button
                onClick={goToCurrentMonth}
                className="px-3 py-2 rounded-xl bg-primary-100 hover:bg-primary-200 text-primary-700 hover:text-primary-800 transition-colors text-sm font-medium"
                title="Go to current month"
              >
                Today
              </button>
            )}
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-800 transition-colors"
              title="Previous month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-800 transition-colors"
              title="Next month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Habit Selector */}
        {habits.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-100 rounded-4xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-neutral-500 text-lg">No habits created yet</p>
            <p className="text-neutral-400">Go to the Habits page to add your first habit</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-3">
                Select a habit to view:
              </label>
              <div className="flex flex-wrap gap-3">
                {habits.map((habit) => (
                  <button
                    key={habit.id}
                    onClick={() => setSelectedHabit(habit)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      selectedHabit?.id === habit.id
                        ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-200'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    <div className="w-6 h-6 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary-600 text-sm">
                        {habit.icon}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{habit.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedHabit && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary-100 rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary-600 text-lg">
                      {selectedHabit.icon}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-neutral-900">{selectedHabit.name}</h3>
                    <p className="text-sm text-neutral-600">Monthly progress view</p>
                  </div>
                </div>

                {/* Monthly Calendar */}
                <div className="bg-neutral-50 rounded-2xl p-4 sm:p-6 lg:p-8">
                  {/* Week Headers */}
                  <div className="grid grid-cols-7 gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 lg:mb-6">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="text-center text-xs sm:text-sm lg:text-base font-medium text-neutral-600 py-2 sm:py-3 lg:py-4">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2 sm:gap-3 lg:gap-4">
                    {monthDates.map((date, index) => {
                      const dateStr = formatDate(date)
                      const isInMonth = isInCurrentMonth(date)
                      const isTodayDate = isToday(date)
                      const isFuture = isFutureDate(date)
                      
                      // Only get habit state for dates that are in the current month and not in the future
                      const habitState = (isInMonth && !isFuture) ? getHabitState(selectedHabit, dateStr) : 'none'

                      return (
                        <div
                          key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                          className={`aspect-square flex flex-col items-center justify-center rounded-lg sm:rounded-xl lg:rounded-2xl text-sm sm:text-base lg:text-lg min-h-[3rem] sm:min-h-[4rem] lg:min-h-[5rem] ${
                            !isInMonth
                              ? 'text-neutral-300'
                              : isTodayDate
                                ? 'bg-primary-100 text-primary-700 font-medium'
                                : 'text-neutral-700'
                          }`}
                        >
                          <span className="text-xs sm:text-sm lg:text-base mb-1 sm:mb-2">{date.getDate()}</span>
                          {isInMonth && !isFuture && (
                            <div className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center ${
                              habitState === 'completed'
                                ? 'bg-green-200'
                                : habitState === 'failed'
                                  ? 'bg-red-200'
                                  : 'bg-neutral-200'
                            }`}>
                              {habitState === 'completed' ? (
                                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : habitState === 'failed' ? (
                                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-red-700" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5 bg-neutral-400 rounded-full"></div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default History