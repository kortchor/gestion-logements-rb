'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AjouterLogement() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [adresse, setAdresse] = useState('')
  const [ville, setVille] = useState('Cassis')

  const villes = ['Cassis', 'La Ciotat', 'Marseille', 'Roquefort-la-Bédoule']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/logements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adresse,
          ville,
          type: 'Appartement',
          chambres: [{ nom: 'Chambre 1', type_lit: 'simple', nombre_lits: 1 }]
        })
      })

      if (response.ok) {
        router.push('/logements')
        router.refresh()
      } else {
        const data = await response.json()
        setError(data.error || 'Erreur lors de la création')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">🏠 Ajouter un logement</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
          <input
            type="text"
            required
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="12 Rue des Calanques, Cassis"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
          <select
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            {villes.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Création...' : '➕ Créer le logement'}
        </button>
      </form>
    </div>
  )
}