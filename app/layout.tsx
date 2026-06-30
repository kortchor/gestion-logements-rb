import "./globals.css";
import UserMenu from '@/app/components/UserMenu';

export const metadata = {
  title: "Gestion Logements - Les Roches Blanches",
  description: "Application de gestion des logements saisonniers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-50">
        <nav className="bg-white shadow-md">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-xl font-bold text-blue-600">
                🏨 Les Roches Blanches
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-wrap gap-4">
                  <a href="/" className="text-gray-700 hover:text-blue-600 transition-colors no-underline">
                    Accueil
                  </a>
                  <a href="/logements" className="text-gray-700 hover:text-blue-600 transition-colors no-underline">
                    Logements
                  </a>
                  <a href="/collaborateurs" className="text-gray-700 hover:text-blue-600 transition-colors no-underline">
                    Collaborateurs
                  </a>
                  <a href="/recherche" className="text-gray-700 hover:text-blue-600 transition-colors no-underline">
                    🔍 Recherche
                  </a>
                  <a href="/dashboard" className="text-gray-700 hover:text-blue-600 transition-colors no-underline">
                    📊 Dashboard
                  </a>
                  <a href="/admin/lits" className="text-gray-700 hover:text-blue-600 transition-colors no-underline">
                    🛏️ Lits
                  </a>
                  <a href="/admin/modeles" className="text-gray-700 hover:text-blue-600 transition-colors no-underline">
                    📄 Modèles
                  </a>
                </div>
                <UserMenu />
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}