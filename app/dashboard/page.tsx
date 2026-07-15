'use client';

import Link from 'next/link';
import Image from 'next/image';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/collaborateurs', label: 'Collaborateurs' },
  { href: '/logements', label: 'Logements' },
  { href: '/admin/modeles', label: 'Modèles' },
];

export default function DashboardPage() {
  return (
    <div
      className="relative flex flex-col min-h-screen w-full bg-cover bg-center"
      // IMPORTANT: Remplacez 'background.jpg' par le nom de votre image de fond
      style={{ backgroundImage: "url('/background.jpg')" }}
    >
      {/* Superposition sombre pour améliorer la lisibilité du texte */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />

      {/* Header avec le logo */}
      <header className="relative z-10 p-4">
        <div className="w-48">
          {/* IMPORTANT: Remplacez 'logo.png' par le nom de votre logo */}
          <Image
            src="/logo.png"
            alt="Logo Les Roches Blanches"
            width={200}
            height={50}
            priority
          />
        </div>
      </header>

      {/* Contenu principal centré */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center text-center text-white p-4">
        <div className="bg-black bg-opacity-30 p-10 rounded-xl backdrop-blur-sm">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
            Gestion des Logements
          </h1>
          <p className="text-lg md:text-xl mb-8" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>
            Bienvenue sur votre espace d'administration.
          </p>

          {/* Liens de navigation */}
          <nav className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-6 py-4 bg-blue-600 bg-opacity-80 rounded-lg text-white font-semibold text-lg hover:bg-blue-700 hover:scale-105 transition-transform duration-300"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </main>
    </div>
  );
}