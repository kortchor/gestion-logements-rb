'use client';

import { useAuth } from '@/app/context/AuthContext';

interface AddCollaborateurButtonProps {
  showLabel?: boolean;
}

export default function AddCollaborateurButton({ showLabel = true }: AddCollaborateurButtonProps) {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'admin_readonly';

  // Masquer le bouton si utilisateur est admin_readonly
  if (isReadOnly) {
    return null;
  }

  return (
    <a
      href="/collaborateurs/nouveau"
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors no-underline"
    >
      {showLabel ? '+ Ajouter un collaborateur' : '+'}
    </a>
  );
}
