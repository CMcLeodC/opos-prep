import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './layouts/Layout'
import Home from './pages/Home'
import Listening from './pages/Listening'
import Writing from './pages/Writing'
import AdminReview from './pages/AdminReview'

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/listening" element={<Listening />} />
          <Route path="/writing" element={<Writing />} />
          <Route path="/admin/review" element={<AdminReview />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
