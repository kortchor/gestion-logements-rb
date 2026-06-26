'use client'

import { useState } from 'react'

export default function TestPage() {
  const [count, setCount] = useState(0)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">🧪 Test Client Component</h1>
      <button
        onClick={() => setCount(count + 1)}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Cliqué {count} fois
      </button>
      <p className="mt-4 text-green-600">✅ Si ce bouton fonctionne, les Client Components marchent !</p>
    </div>
  )
}