function History() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-neutral-900 mb-2">History</h1>
        <p className="text-neutral-600 text-lg">View your habit tracking history and progress over time</p>
      </div>
      
      <div className="space-y-6">
        <div className="card p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-primary-100 rounded-3xl flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-medium text-neutral-900">Monthly Overview</h2>
              <p className="text-neutral-600">Your habit completion trends</p>
            </div>
          </div>
          
          <div className="bg-surface-variant rounded-3xl p-6 text-center">
            <p className="text-neutral-600">Historical data will appear here once you start tracking habits</p>
          </div>
        </div>
        
        <div className="card p-8">
          <h3 className="text-2xl font-medium text-neutral-900 mb-6">Streak Records</h3>
          <div className="bg-surface-variant rounded-3xl p-6 text-center">
            <p className="text-neutral-600">Your best streaks will be displayed here</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default History