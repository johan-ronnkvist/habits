import { NavLink } from 'react-router-dom'

function Navbar() {
  return (
    <nav className="bg-primary-600 shadow-elevation-2">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-xl font-medium text-white">Better Habits</h1>
          
          <div className="flex space-x-2">
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                isActive 
                  ? 'p-3 rounded-2xl text-primary-700 bg-surface shadow-elevation-1' 
                  : 'p-3 rounded-2xl text-primary-100 hover:text-white hover:bg-primary-500 transition-all duration-200'
              }
              title="Overview"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </NavLink>
            
            <NavLink 
              to="/habits" 
              className={({ isActive }) => 
                isActive 
                  ? 'p-3 rounded-2xl text-primary-700 bg-surface shadow-elevation-1' 
                  : 'p-3 rounded-2xl text-primary-100 hover:text-white hover:bg-primary-500 transition-all duration-200'
              }
              title="Habits"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </NavLink>
            
            <NavLink 
              to="/history" 
              className={({ isActive }) => 
                isActive 
                  ? 'p-3 rounded-2xl text-primary-700 bg-surface shadow-elevation-1' 
                  : 'p-3 rounded-2xl text-primary-100 hover:text-white hover:bg-primary-500 transition-all duration-200'
              }
              title="History"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </NavLink>
            
            <NavLink 
              to="/settings" 
              className={({ isActive }) => 
                isActive 
                  ? 'p-3 rounded-2xl text-primary-700 bg-surface shadow-elevation-1' 
                  : 'p-3 rounded-2xl text-primary-100 hover:text-white hover:bg-primary-500 transition-all duration-200'
              }
              title="Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar