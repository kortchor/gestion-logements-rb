import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold text-blue-600 mb-8">
          🏨 Gestion des Logements - Les Roches Blanches
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">🏠 Logements</h2>
            <p className="text-gray-600">Gérer les 50 logements</p>
            <a href="/logements" className="text-blue-500 hover:underline">
              Voir →
            </a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">👥 Collaborateurs</h2>
            <p className="text-gray-600">Gérer les saisonniers</p>
            <a href="/collaborateurs" className="text-blue-500 hover:underline">
              Voir →
            </a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">📊 Dashboard</h2>
            <p className="text-gray-600">Voir les statistiques</p>
            <a href="/dashboard" className="text-blue-500 hover:underline">
              Voir →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}