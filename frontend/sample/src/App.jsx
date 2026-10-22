import { useEffect, useState } from 'react'
import './App.css'

// requests go to /api on the Vite server, which proxies them to the
// FastAPI backend (see server.proxy in vite.config.js)
const API_URL = '/api'

function App() {
  // state: values that, when changed, make React re-render the page
  const [message, setMessage] = useState('Loading...')
  const [dbStatus, setDbStatus] = useState('Not checked yet')
  const [checking, setChecking] = useState(false)
  const [users, setUsers] = useState([])
  const [usersError, setUsersError] = useState('')

  // useEffect with [] runs once, right after the page first appears
  useEffect(() => {
    fetch(`${API_URL}/`)
      .then((response) => response.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('Could not reach the backend'))

    fetch(`${API_URL}/users`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((data) => setUsers(data))
      .catch((error) => setUsersError(`Failed: ${error.message}`))
  }, [])

  // runs when the button is clicked
  async function checkDatabase() {
    setChecking(true)
    try {
      const response = await fetch(`${API_URL}/db-check`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setDbStatus(data.database)
    } catch (error) {
      setDbStatus(`Failed: ${error.message}`)
    } finally {
      setChecking(false)
    }
  }

  return (
    <main className="app">
      <h1>My App</h1>

      <section className="card">
        <h2>Backend</h2>
        <p>{message}</p>
      </section>

      <section className="card">
        <h2>Database</h2>
        <p>{dbStatus}</p>
        <button onClick={checkDatabase} disabled={checking}>
          {checking ? 'Checking...' : 'Check database'}
        </button>
      </section>

      <section className="card">
        <h2>Users</h2>
        {usersError && <p>{usersError}</p>}
        {!usersError && users.length === 0 && <p>No users yet</p>}
        <ul className="user-list">
          {/* key tells React which list item is which; use something unique */}
          {users.map((user) => (
            <li key={user.id}>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
