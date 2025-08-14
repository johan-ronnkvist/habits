function Habits() {
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
        
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="e.g., Read for 20 minutes, Exercise daily..."
            className="input-field flex-1"
          />
          <button className="btn-primary">
            Add Habit
          </button>
        </div>
      </div>
      
      <div className="card p-8">
        <h3 className="text-2xl font-medium text-neutral-900 mb-6">Your Habits</h3>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-neutral-100 rounded-4xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-neutral-500 text-lg">No habits created yet</p>
          <p className="text-neutral-400">Use the form above to add your first habit</p>
        </div>
      </div>
    </div>
  )
}

export default Habits