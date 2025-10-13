import { useState } from 'react'

export function SimpleAdmin() {
  const [solutions, setSolutions] = useState([])
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  const testAdmin = async () => {
    if (!token) {
      alert('Enter access token first')
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod/admin/solutions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      if (response.ok) {
        setSolutions(data.solutions || [])
      } else {
        alert(`Error: ${response.status} - ${JSON.stringify(data)}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Admin Test</h1>
      
      <div className="mb-4">
        <label className="block mb-2">Access Token:</label>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Paste access token here"
        />
      </div>
      
      <button
        onClick={testAdmin}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Admin Endpoint'}
      </button>
      
      <div className="mt-4">
        <h2 className="text-xl font-semibold">Solutions ({solutions.length}):</h2>
        {solutions.map((solution: any) => (
          <div key={solution.solutionId} className="border p-2 mt-2">
            <h3 className="font-bold">{solution.name}</h3>
            <p>Status: {solution.status}</p>
            <p>Partner: {solution.partnerName}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
