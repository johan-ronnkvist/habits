function Overview() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-neutral-900 mb-2">Overview</h1>
        <p className="text-neutral-600 text-lg">Welcome to your habit tracking dashboard</p>
      </div>
      
      <div className="card p-8">
        <h2 className="text-2xl font-medium text-neutral-900 mb-4">Weekly Progress</h2>
        <p className="text-neutral-600 mb-6">Track your habit completion across the week</p>
        
        <div className="grid grid-cols-7 gap-4 mb-6">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <div key={day} className="text-center">
              <div className="text-sm font-medium text-neutral-700 mb-2">{day}</div>
              <div className="w-12 h-12 bg-surface-variant rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-xs text-neutral-500">{index + 1}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-primary-50 rounded-3xl p-6 text-center">
          <p className="text-primary-700 font-medium">Add habits to start tracking your progress!</p>
        </div>
      </div>
    </div>
  )
}

export default Overview