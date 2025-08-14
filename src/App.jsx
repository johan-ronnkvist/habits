import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Overview from './pages/Overview'
import Habits from './pages/Habits'
import History from './pages/History'
import Settings from './pages/Settings'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-surface-variant">
        <Navbar />
        <main className="py-8">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
