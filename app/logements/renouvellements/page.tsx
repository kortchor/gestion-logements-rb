'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';

type StatutContrat = 'expire' | 'actif' | 'indefini' | 'sans_debut';

type FilterStatus = 'expired' | 'active' | 'indefini' | 'missing-start' | 'all';

interface RenouvellementItem {
  id: number;
  nom_logement: string;
  adresse: string;
  ville: string;
  prix_loyer: number;
  est_actif: boolean;
  date_debut_contrat: string | null;
  date_fin_contrat: string | null;
  statut_contrat: StatutContrat;
}

interface RenouvellementCounts {
  total: number;
  expire: number;
  actif: number;
  indefini: number;
  sans_debut: number;
}

interface DraftDates {
  date_debut_contrat: string;
  date_fin_contrat: string;
}

interface BulkDates {
  date_debut_contrat: string;
  date_fin_contrat: string;
}

const STATUS_LABELS: Record<FilterStatus, string> = {
  expired: 'Expires',
  active: 'Actifs',
  indefini: 'Indefinis',
  'missing-start': 'Debut manquant',
  all: 'Tous',
};

function formatDate(dateValue: string | null): string {
  if (!dateValue) {
    return 'Indetermine';
  }
  return dateValue.split('T')[0];
}

export default function RenouvellementsPage() {
  const { user, loading } = useAuth();
  const canAccess = !!user && ['admin', 'super_admin', 'admin_readonly'].includes(user.role);

  const [status, setStatus] = useState<FilterStatus>('expired');
  const [items, setItems] = useState<RenouvellementItem[]>([]);
  const [counts, setCounts] = useState<RenouvellementCounts | null>(null);
  const [drafts, setDrafts] = useState<Record<number, DraftDates>>({});
  const [bulkDates, setBulkDates] = useState<BulkDates>({ date_debut_contrat: '', date_fin_contrat: '' });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingBulk, setSavingBulk] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canWrite = !!user && ['admin', 'super_admin'].includes(user.role);

  const resetFeedback = () => {
    setError('');
    setSuccess('');
  };

  const syncDrafts = (rows: RenouvellementItem[]) => {
    const next: Record<number, DraftDates> = {};
    for (const row of rows) {
      next[row.id] = {
        date_debut_contrat: row.date_debut_contrat ? row.date_debut_contrat.split('T')[0] : '',
        date_fin_contrat: row.date_fin_contrat ? row.date_fin_contrat.split('T')[0] : '',
      };
    }
    setDrafts(next);
  };

  const loadData = useCallback(async () => {
    if (!canAccess) {
      return;
    }
    try {
      setLoadingPage(true);
      resetFeedback();

      const response = await fetch(`/api/logements/renouvellements?status=${status}`, {
        credentials: 'include',
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setItems([]);
        setCounts(null);
        setError(payload.error || 'Erreur lors du chargement des renouvellements.');
        return;
      }

      const rows: RenouvellementItem[] = Array.isArray(payload.data) ? payload.data : [];
      setItems(rows);
      setCounts(payload.counts || null);
      syncDrafts(rows);
      setSelectedIds([]);
    } catch {
      setItems([]);
      setCounts(null);
      setError('Erreur reseau lors du chargement des renouvellements.');
    } finally {
      setLoadingPage(false);
    }
  }, [canAccess, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalLoyerMois = useMemo(() => {
    return items.reduce((sum, row) => sum + (Number(row.prix_loyer) || 0), 0);
  }, [items]);

  const handleDraftChange = (logementId: number, field: keyof DraftDates, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [logementId]: {
        ...prev[logementId],
        [field]: value,
      },
    }));
  };

  const handleSave = async (logementId: number) => {
    const draft = drafts[logementId];
    if (!draft) {
      return;
    }

    try {
      setSavingId(logementId);
      resetFeedback();

      const response = await fetch('/api/logements/renouvellements', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          logementId,
          date_debut_contrat: draft.date_debut_contrat,
          date_fin_contrat: draft.date_fin_contrat,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload.error || 'Impossible de mettre a jour les dates.');
        return;
      }

      setSuccess('Dates de bail mises a jour avec succes.');
      await loadData();
    } catch {
      setError('Erreur reseau lors de la mise a jour.');
    } finally {
      setSavingId(null);
    }
  };

  const isSelected = (logementId: number) => selectedIds.includes(logementId);

  const toggleSelected = (logementId: number) => {
    setSelectedIds((prev) =>
      prev.includes(logementId)
        ? prev.filter((id) => id !== logementId)
        : [...prev, logementId]
    );
  };

  const areAllSelected = items.length > 0 && selectedIds.length === items.length;

  const toggleSelectAll = () => {
    if (areAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  const handleBulkSave = async () => {
    if (!canWrite || selectedIds.length === 0) {
      return;
    }

    try {
      setSavingBulk(true);
      resetFeedback();

      const response = await fetch('/api/logements/renouvellements', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          logementIds: selectedIds,
          date_debut_contrat: bulkDates.date_debut_contrat,
          date_fin_contrat: bulkDates.date_fin_contrat,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload.error || 'Impossible de mettre a jour les logements selectionnes.');
        return;
      }

      setSuccess(`${payload.updated || selectedIds.length} logement(s) mis a jour.`);
      await loadData();
    } catch {
      setError('Erreur reseau lors de la mise a jour en masse.');
    } finally {
      setSavingBulk(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  if (!canAccess) {
    return (
      <div className="p-8 text-center text-red-600">
        Acces refuse. Profil administrateur requis.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold">Renouvellements de baux</h1>
          <p className="text-gray-600 mt-2">Filtrer les baux expires et mettre a jour les dates rapidement</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {error && <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">{error}</div>}
        {success && <div className="mb-4 bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded">{success}</div>}

        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-gray-700 mr-2">Filtre:</span>
          {(Object.keys(STATUS_LABELS) as FilterStatus[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={`px-3 py-1 rounded-full text-sm ${status === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              {STATUS_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Renouvellement en masse</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Date debut</label>
              <input
                type="date"
                value={bulkDates.date_debut_contrat}
                onChange={(e) => setBulkDates((prev) => ({ ...prev, date_debut_contrat: e.target.value }))}
                className="border border-gray-300 rounded px-2 py-1 w-full"
                disabled={!canWrite || savingBulk}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Date fin (vide = indefini)</label>
              <input
                type="date"
                value={bulkDates.date_fin_contrat}
                onChange={(e) => setBulkDates((prev) => ({ ...prev, date_fin_contrat: e.target.value }))}
                className="border border-gray-300 rounded px-2 py-1 w-full"
                disabled={!canWrite || savingBulk}
              />
            </div>
            <div className="text-sm text-gray-600">
              {selectedIds.length} logement(s) selectionne(s)
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={handleBulkSave}
                disabled={!canWrite || savingBulk || selectedIds.length === 0}
                className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingBulk ? 'Mise a jour...' : 'Appliquer aux selectionnes'}
              </button>
            </div>
          </div>
        </div>

        {counts && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{counts.total}</p></div>
            <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Expires</p><p className="text-2xl font-bold text-red-600">{counts.expire}</p></div>
            <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Actifs</p><p className="text-2xl font-bold text-green-600">{counts.actif}</p></div>
            <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Indefinis</p><p className="text-2xl font-bold text-emerald-600">{counts.indefini}</p></div>
            <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Debut manquant</p><p className="text-2xl font-bold text-amber-600">{counts.sans_debut}</p></div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loadingPage ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Aucun logement pour ce filtre.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        checked={areAllSelected}
                        onChange={toggleSelectAll}
                        disabled={items.length === 0 || !canWrite || savingBulk}
                        aria-label="Selectionner tous les logements"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logement</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Loyer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Debut bail</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fin bail (vide = indefini)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((row) => {
                    const draft = drafts[row.id] || { date_debut_contrat: '', date_fin_contrat: '' };
                    return (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected(row.id)}
                            onChange={() => toggleSelected(row.id)}
                            disabled={!canWrite || savingBulk}
                            aria-label={`Selectionner ${row.nom_logement}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{row.nom_logement}</div>
                          <div className="text-xs text-gray-500">{row.adresse}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.ville}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">{Number(row.prix_loyer).toFixed(2)} EUR</td>
                        <td className="px-4 py-3 text-sm">
                          {row.statut_contrat === 'expire' && <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">Expire</span>}
                          {row.statut_contrat === 'actif' && <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">Actif</span>}
                          {row.statut_contrat === 'indefini' && <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs">Indefini</span>}
                          {row.statut_contrat === 'sans_debut' && <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs">Debut manquant</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="date"
                            value={draft.date_debut_contrat}
                            onChange={(e) => handleDraftChange(row.id, 'date_debut_contrat', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            disabled={!canWrite || savingId === row.id}
                          />
                          <div className="text-xs text-gray-400 mt-1">Actuel: {formatDate(row.date_debut_contrat)}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="date"
                            value={draft.date_fin_contrat}
                            onChange={(e) => handleDraftChange(row.id, 'date_fin_contrat', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            disabled={!canWrite || savingId === row.id}
                          />
                          <div className="text-xs text-gray-400 mt-1">Actuel: {formatDate(row.date_fin_contrat)}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/logements/${row.id}/modifier`} className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700 no-underline">
                              Ouvrir
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleSave(row.id)}
                              disabled={!canWrite || savingId === row.id}
                              className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {savingId === row.id ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            Total loyer sur le filtre courant: <span className="font-bold">{totalLoyerMois.toFixed(2)} EUR</span>
          </p>
        </div>

        <div className="mt-8 flex gap-3">
          <Link href="/logements" className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 no-underline">Retour logements</Link>
          <Link href="/logements/monthly-cost" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 no-underline">Voir prevision mensuelle</Link>
        </div>
      </div>
    </div>
  );
}
