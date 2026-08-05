'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface BedOption {
  logement_id: number;
  logement_label: string;
  chambre_id: number;
  chambre_nom: string;
  lit_id: number;
  lit_numero: string;
}

interface CollaborateurOption {
  id: number;
  prenom: string;
  nom: string;
}

interface HistoryRow {
  id: number;
  lit_id: number;
  collaborateur_id: number;
  date_debut: string;
  date_fin: string;
  commentaire: string | null;
  logement_label: string;
  chambre_nom: string;
  lit_numero: string;
  prenom: string;
  nom: string;
}

export default function OccupationsHistoriquePage() {
  const [beds, setBeds] = useState<BedOption[]>([]);
  const [collaborateurs, setCollaborateurs] = useState<CollaborateurOption[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [logementId, setLogementId] = useState('');
  const [chambreId, setChambreId] = useState('');
  const [litId, setLitId] = useState('');
  const [collaborateurId, setCollaborateurId] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [commentaire, setCommentaire] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/occupations-historique', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erreur de chargement');
      }
      setBeds(json.data.beds || []);
      setCollaborateurs(json.data.collaborateurs || []);
      setHistory(json.data.history || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const logements = useMemo(() => {
    const map = new Map<number, string>();
    beds.forEach((b) => map.set(b.logement_id, b.logement_label));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [beds]);

  const chambres = useMemo(() => {
    if (!logementId) return [];
    const selected = Number.parseInt(logementId, 10);
    const map = new Map<number, string>();
    beds
      .filter((b) => b.logement_id === selected)
      .forEach((b) => map.set(b.chambre_id, b.chambre_nom));
    return Array.from(map.entries()).map(([id, nom]) => ({ id, nom }));
  }, [beds, logementId]);

  const lits = useMemo(() => {
    if (!chambreId) return [];
    const selected = Number.parseInt(chambreId, 10);
    return beds.filter((b) => b.chambre_id === selected);
  }, [beds, chambreId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!litId || !collaborateurId || !dateDebut || !dateFin) {
      setError('Merci de compléter tous les champs obligatoires.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/occupations-historique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lit_id: Number.parseInt(litId, 10),
          collaborateur_id: Number.parseInt(collaborateurId, 10),
          date_debut: dateDebut,
          date_fin: dateFin,
          commentaire,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erreur lors de la sauvegarde');
      }

      setSuccess('Historique enregistré avec succès.');
      setCommentaire('');
      setDateDebut('');
      setDateFin('');
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Historique des occupations</h1>
          <Link href="/admin/lits" className="text-blue-600 hover:underline">
            Retour gestion des lits
          </Link>
        </div>

        {error ? <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div> : null}
        {success ? <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-green-800">{success}</div> : null}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Ajouter une occupation historique</h2>

          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium">Logement</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={logementId}
                onChange={(e) => {
                  setLogementId(e.target.value);
                  setChambreId('');
                  setLitId('');
                }}
              >
                <option value="">Sélectionner</option>
                {logements.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Chambre</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={chambreId}
                onChange={(e) => {
                  setChambreId(e.target.value);
                  setLitId('');
                }}
                disabled={!logementId}
              >
                <option value="">Sélectionner</option>
                {chambres.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Lit</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={litId}
                onChange={(e) => setLitId(e.target.value)}
                disabled={!chambreId}
              >
                <option value="">Sélectionner</option>
                {lits.map((l) => (
                  <option key={l.lit_id} value={l.lit_id}>Lit {l.lit_numero}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Collaborateur</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={collaborateurId}
                onChange={(e) => setCollaborateurId(e.target.value)}
              >
                <option value="">Sélectionner</option>
                {collaborateurs.map((c) => (
                  <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Date début</label>
              <input
                type="date"
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Date fin</label>
              <input
                type="date"
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Commentaire (optionnel)</label>
              <textarea
                className="w-full rounded border border-gray-300 px-3 py-2"
                rows={3}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Ex: rotation RH, changement de chambre..."
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving || loading}
                className="rounded bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer cet historique'}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Historique récent</h2>

          {loading ? (
            <p className="text-gray-500">Chargement...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-500">Aucun historique enregistré pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-2">Logement</th>
                    <th className="px-3 py-2">Chambre / Lit</th>
                    <th className="px-3 py-2">Collaborateur</th>
                    <th className="px-3 py-2">Période</th>
                    <th className="px-3 py-2">Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="px-3 py-2">{row.logement_label}</td>
                      <td className="px-3 py-2">{row.chambre_nom} / {row.lit_numero}</td>
                      <td className="px-3 py-2">{row.prenom} {row.nom}</td>
                      <td className="px-3 py-2">{new Date(row.date_debut).toLocaleDateString('fr-FR')} - {new Date(row.date_fin).toLocaleDateString('fr-FR')}</td>
                      <td className="px-3 py-2">{row.commentaire || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
