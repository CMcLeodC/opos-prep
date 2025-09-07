import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './layouts/Layout'
import Home from './pages/Home'
import Listening from './pages/Listening'
import Writing from './pages/Writing'
import AdminReview from './pages/AdminReview'
import MySubmissions from './pages/MySubmissions'
import Login from './pages/Login'
import Profile from './pages/Profile'
import ListeningTests from './pages/ListeningTests'
import AdminListeningReview from './pages/AdminListeningReview'
import AdminListeningResults from './pages/AdminListeningResults'
import OpoMentorLanding from './pages/Landing'

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/landing" element={<OpoMentorLanding />} />
          <Route path="/listening" element={<Listening />} />
          <Route path="/listening-tests" element={<ListeningTests />} />
          <Route path="/writing" element={<Writing />} />
          <Route path="/admin/writing-review" element={<AdminReview />} />
          <Route path="/admin/listening-review" element={<AdminListeningReview />} />
          <Route path="/admin/listening-results" element={<AdminListeningResults />} />
          <Route path="/my-submissions" element={<MySubmissions />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
