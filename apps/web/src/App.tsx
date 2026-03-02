import { BrowserRouter, Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <h1>Hello OrganizrX</h1>
              <p>Welcome to the OrganizrX platform</p>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
