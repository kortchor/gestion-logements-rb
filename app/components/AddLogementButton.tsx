'use client';

import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

interface AddLogementButtonProps {
  showLabel?: boolean;
}

export default function AddLogementButton({ showLabel = true }: AddLogementButtonProps) {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'admin_readonly';

  // Masquer le bouton si utilisateur est admin_readonly
  if (isReadOnly) {
    return null;
  }

  return (
    <Link
      href="/logements/nouveau"
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors no-underline"
    >
      {showLabel ? '+ Ajouter un logement' : '+'}
    </Link>
  );
}
