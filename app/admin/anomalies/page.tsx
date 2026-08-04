'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

interface AnomaliesData {
  logementsIncomplets: Array<{ id: number; nom_logement: string | null; adresse: string | null; ville: string | null; est_actif: boolean }>;
  logementsSansChambre: Array<{ id: number; nom_logement: string | null; adresse: string | null; ville: string | null; est_actif: boolean }>;
  chambresSansLit: Array<{ id: number; nom: string; type_lit: string; nombre_lits: number; logement_id: number; nom_logement: string | null; ville: string | null }>;
  litsOrphelins: Array<{ id: number; numero: string | null; chambre_id: number | null; collaborateur_id: number | null }>;
  bauxInvalides: Array<{ id: number; date_debut: string | null; date_fin: string | null; collaborateur_id: number | null; prenom: string | null; nom: string | null; logement_id: number | null; nom_logement: string | null; ville: string | null }>;
  litsSurcharges: Array<{ id: number; numero: string | null; type_lit: string | null; occupant_count: number; chambre_nom: string | null; logement_id: number | null; nom_logement: string | null; ville: string | null }>;
  litsConflits: Array<{ id: number; numero: string | null; type_lit: string | null; legacy_collaborateur_id: number | null; occupants_count: number; chambre_nom: string | null; logement_id: number | null; nom_logement: string | null; ville: string | null }>;
}

interface Totals {
  logementsIncomplets: number;
  logementsSansChambre: number;
  chambresSansLit: number;
  litsOrphelins: number;
  bauxInvalides: number;
  litsSurcharges: number;
  litsConflits: number;
}

export default function AnomaliesPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<AnomaliesData | null>(null);
  const [sectionFilter, setSectionFilter] = useState('all');
  const [showEmptySections, setShowEmptySections] = useState(false);
  const [sortMode, setSortMode] = useState<'impact' | 'original'>('impact');
  const [totals, setTotals] = useState<Totals>({
    logementsIncomplets: 0,
    logementsSansChambre: 0,
    chambresSansLit: 0,
    litsOrphelins: 0,
    bauxInvalides: 0,
    litsSurcharges: 0,
    litsConflits: 0,
  });
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnomalies = async () => {
    try {
      setPageLoading(true);
      setError(null);
      const response = await fetch('/api/admin/anomalies', { credentials: 'include' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors du chargement des anomalies');
      }
      setData(result.data);
      setTotals(result.totals || totals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAnomalies();
    }
  }, [user]);

  const totalAnomalies = useMemo(
    () => Object.values(totals).reduce((sum, value) => sum + value, 0),
    [totals]
  );

  const visibleSections = useMemo(() => {
    const sections = [
      { key: 'logements-incomplets', filter: 'logementsIncomplets', title: 'Logements incomplets', count: totals.logementsIncomplets },
      { key: 'logements-sans-chambre', filter: 'logementsSansChambre', title: 'Logements sans chambre', count: totals.logementsSansChambre },
      { key: 'chambres-sans-lit', filter: 'chambresSansLit', title: 'Chambres sans lit', count: totals.chambresSansLit },
      { key: 'lits-orphelins', filter: 'litsOrphelins', title: 'Lits orphelins', count: totals.litsOrphelins },
      { key: 'baux-invalides', filter: 'bauxInvalides', title: 'Baux invalides', count: totals.bauxInvalides },
      { key: 'lits-surcharges', filter: 'litsSurcharges', title: 'Lits surchargés', count: totals.litsSurcharges },
      { key: 'lits-conflits', filter: 'litsConflits', title: 'Lits en conflit', count: totals.litsConflits },
    ];

    if (sectionFilter === 'all') {
      const orderedSections = sortMode === 'impact'
        ? [...sections].sort((a, b) => b.count - a.count)
        : sections;

      return showEmptySections
        ? orderedSections
        : orderedSections.filter((section) => section.count > 0);
    }

    return sections.filter((section) => section.filter === sectionFilter);
  }, [sectionFilter, showEmptySections, sortMode, totals]);

  const exportCsv = () => {
    if (!data) return;

    const rows: string[] = [];
    rows.push('section,id,titre,ville,details,action_suggeree');

    const pushRow = (
      section: string,
      id: string | number,
      titre: string,
      ville: string | null | undefined,
      details: string,
      action: string
    ) => {
      const escape = (value: string | number | null | undefined) =>
        `"${String(value ?? '').replace(/"/g, '""')}"`;

      rows.push([
        escape(section),
        escape(id),
        escape(titre),
        escape(ville),
        escape(details),
        escape(action),
      ].join(','));
    };

    data.logementsIncomplets.forEach((item) => {
      pushRow(
        'logements_incomplets',
        item.id,
        item.nom_logement || item.adresse || 'Sans nom',
        item.ville,
        `adresse=${item.adresse || 'N/A'}; actif=${item.est_actif ? 'oui' : 'non'}`,
        'Corriger le logement'
      );
    });

    data.logementsSansChambre.forEach((item) => {
      pushRow(
        'logements_sans_chambre',
        item.id,
        item.nom_logement || item.adresse || 'Sans nom',
        item.ville,
        `adresse=${item.adresse || 'N/A'}; actif=${item.est_actif ? 'oui' : 'non'}`,
        'Ajouter au moins une chambre'
      );
    });

    data.chambresSansLit.forEach((item) => {
      pushRow(
        'chambres_sans_lit',
        item.id,
        item.nom,
        item.ville,
        `logement=${item.nom_logement || 'N/A'}; type_lit=${item.type_lit}; nombre_lits=${item.nombre_lits}`,
        'Créer ou rattacher des lits'
      );
    });

    data.litsOrphelins.forEach((item) => {
      pushRow(
        'lits_orphelins',
        item.id,
        item.numero || 'Sans numéro',
        '',
        `chambre_id=${item.chambre_id || 'N/A'}; collaborateur_id=${item.collaborateur_id || 'N/A'}`,
        'Rattacher le lit à une chambre valide'
      );
    });

    data.bauxInvalides.forEach((item) => {
      pushRow(
        'baux_invalides',
        item.id,
        `${item.prenom || ''} ${item.nom || ''}`.trim() || 'Sans collaborateur',
        item.ville,
        `debut=${item.date_debut || 'N/A'}; fin=${item.date_fin || 'N/A'}; logement=${item.nom_logement || 'N/A'}`,
        'Vérifier le bail'
      );
    });

    data.litsSurcharges.forEach((item) => {
      pushRow(
        'lits_surcharges',
        item.id,
        item.numero || 'Sans numéro',
        item.ville,
        `type_lit=${item.type_lit || 'N/A'}; occupants=${item.occupant_count}; logement=${item.nom_logement || 'N/A'}`,
        'Répartir ou réduire l’occupation'
      );
    });

    data.litsConflits.forEach((item) => {
      pushRow(
        'lits_conflits',
        item.id,
        item.numero || 'Sans numéro',
        item.ville,
        `type_lit=${item.type_lit || 'N/A'}; occupants=${item.occupants_count}; legacy=${item.legacy_collaborateur_id || 'N/A'}`,
        'Synchroniser les données legacy et lit_occupants'
      );
    });

    const bom = '\uFEFF';
    const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anomalies-${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading || pageLoading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return <div className="p-8 text-center text-red-600">❌ Accès refusé. Administrateur requis.</div>;
  }

  const hasData = data !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold">⚠️ Anomalies à corriger</h1>
          <p className="text-gray-600 mt-2">Contrôle automatique des données à nettoyer ou compléter</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">❌ {error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total anomalies</p>
            <p className="text-3xl font-bold text-red-600">{totalAnomalies}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Logements incomplets</p>
            <p className="text-3xl font-bold text-orange-600">{totals.logementsIncomplets}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Chambres sans lit</p>
            <p className="text-3xl font-bold text-amber-600">{totals.chambresSansLit}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Lits en conflit</p>
            <p className="text-3xl font-bold text-purple-600">{totals.litsConflits}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/dashboard" className="inline-flex items-center rounded-md bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400">← Retour dashboard</Link>
          <Link href="/admin/logements-tableau" className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Voir tableau logements</Link>
          <Link href="/admin/lits" className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">Voir les lits</Link>
          <button onClick={exportCsv} className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">Exporter CSV</button>
          <button onClick={fetchAnomalies} className="inline-flex items-center rounded-md bg-slate-700 px-4 py-2 text-white hover:bg-slate-800">Rafraîchir</button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Filtrer par type</p>
            <p className="text-sm text-gray-500">Affiche une seule famille d’anomalies pour corriger plus vite.</p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full md:w-80 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Toutes les anomalies</option>
              <option value="logementsIncomplets">Logements incomplets</option>
              <option value="logementsSansChambre">Logements sans chambre</option>
              <option value="chambresSansLit">Chambres sans lit</option>
              <option value="litsOrphelins">Lits orphelins</option>
              <option value="bauxInvalides">Baux invalides</option>
              <option value="litsSurcharges">Lits surchargés</option>
              <option value="litsConflits">Lits en conflit</option>
            </select>
            <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showEmptySections}
                onChange={(e) => setShowEmptySections(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Afficher aussi les sections vides
            </label>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as 'impact' | 'original')}
              className="w-full md:w-56 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="impact">Trier par impact</option>
              <option value="original">Ordre d’origine</option>
            </select>
          </div>
        </div>

        {!hasData ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">Aucune donnée disponible</div>
        ) : (
          <div className="space-y-6">
            {visibleSections.map((section) => {
              if (section.filter === 'logementsIncomplets') {
                return (
            <section key={section.key} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="font-semibold">{section.title}</h2>
                <span className="text-sm text-gray-500">{data.logementsIncomplets.length}</span>
              </div>
              <div className="p-6">
                {data.logementsIncomplets.length ? (
                  <ul className="space-y-2">
                    {data.logementsIncomplets.map((item) => (
                      <li key={item.id} className="flex items-center justify-between rounded border px-3 py-2">
                        <div>
                          <p className="font-medium">#{item.id} {item.nom_logement || item.adresse || 'Sans nom'}</p>
                          <p className="text-sm text-gray-500">Adresse: {item.adresse || 'Non renseignée'} · Ville: {item.ville || 'Non renseignée'}</p>
                        </div>
                        <div className="flex gap-3 text-sm">
                          <Link href={`/logements/${item.id}`} className="text-gray-600 hover:underline">Voir</Link>
                          <Link href={`/logements/${item.id}/modifier`} className="text-blue-600 hover:underline">Corriger</Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-gray-500">Aucune anomalie détectée</p>}
              </div>
            </section>
                );
              }

              if (section.filter === 'logementsSansChambre') {
                return (
            <section key={section.key} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="font-semibold">{section.title}</h2>
                <span className="text-sm text-gray-500">{data.logementsSansChambre.length}</span>
              </div>
              <div className="p-6">
                {data.logementsSansChambre.length ? (
                  <ul className="space-y-2">
                    {data.logementsSansChambre.map((item) => (
                      <li key={item.id} className="flex items-center justify-between rounded border px-3 py-2">
                        <div>
                          <p className="font-medium">#{item.id} {item.nom_logement || item.adresse}</p>
                          <p className="text-sm text-gray-500">{item.adresse} · {item.ville}</p>
                        </div>
                        <div className="flex gap-3 text-sm">
                          <Link href={`/logements/${item.id}`} className="text-gray-600 hover:underline">Voir</Link>
                          <Link href={`/logements/${item.id}/modifier`} className="text-blue-600 hover:underline">Ajouter des chambres</Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-gray-500">Aucune anomalie détectée</p>}
              </div>
            </section>
                );
              }

              if (section.filter === 'chambresSansLit') {
                return (
            <section key={section.key} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="font-semibold">{section.title}</h2>
                <span className="text-sm text-gray-500">{data.chambresSansLit.length}</span>
              </div>
              <div className="p-6">
                {data.chambresSansLit.length ? (
                  <ul className="space-y-2">
                    {data.chambresSansLit.map((item) => (
                      <li key={item.id} className="flex items-center justify-between rounded border px-3 py-2">
                        <div>
                          <p className="font-medium">{item.nom}</p>
                          <p className="text-sm text-gray-500">{item.nom_logement || 'Logement inconnu'} · {item.ville || 'N/A'} · {item.type_lit} · {item.nombre_lits} lit(s)</p>
                        </div>
                        <div className="flex gap-3 text-sm">
                          <Link href={`/logements/${item.logement_id}`} className="text-gray-600 hover:underline">Voir</Link>
                          <Link href={`/logements/${item.logement_id}/modifier`} className="text-blue-600 hover:underline">Corriger</Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-gray-500">Aucune anomalie détectée</p>}
              </div>
            </section>
                );
              }

              if (section.filter === 'litsOrphelins') {
                return (
            <section key={section.key} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="font-semibold">{section.title}</h2>
                <span className="text-sm text-gray-500">{data.litsOrphelins.length}</span>
              </div>
              <div className="p-6">
                {data.litsOrphelins.length ? (
                  <ul className="space-y-2">
                    {data.litsOrphelins.map((item) => (
                      <li key={item.id} className="flex items-center justify-between rounded border px-3 py-2">
                        <div>
                          <p className="font-medium">Lit #{item.id} {item.numero || ''}</p>
                          <p className="text-sm text-gray-500">Chambre manquante</p>
                        </div>
                        <div className="flex gap-3 text-sm">
                          <Link href="/admin/lits" className="text-blue-600 hover:underline">Voir les lits</Link>
                          <span className="text-xs text-red-600">A corriger en base</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-gray-500">Aucune anomalie détectée</p>}
              </div>
            </section>
                );
              }

              if (section.filter === 'bauxInvalides') {
                return (
            <section key={section.key} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="font-semibold">{section.title}</h2>
                <span className="text-sm text-gray-500">{data.bauxInvalides.length}</span>
              </div>
              <div className="p-6">
                {data.bauxInvalides.length ? (
                  <ul className="space-y-2">
                    {data.bauxInvalides.map((item) => (
                      <li key={item.id} className="flex items-center justify-between rounded border px-3 py-2">
                        <div>
                          <p className="font-medium">Bail #{item.id} {item.prenom || ''} {item.nom || ''}</p>
                          <p className="text-sm text-gray-500">{item.nom_logement || 'Logement'} · {item.ville || 'N/A'}</p>
                          <p className="text-xs text-red-600">{item.date_debut || 'Date début manquante'} → {item.date_fin || 'Date fin manquante / invalide'}</p>
                        </div>
                        {item.collaborateur_id ? <Link href={`/collaborateurs/${item.collaborateur_id}`} className="text-blue-600 hover:underline">Voir collaborateur</Link> : <span className="text-xs text-gray-400">N/A</span>}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-gray-500">Aucune anomalie détectée</p>}
              </div>
            </section>
                );
              }

              if (section.filter === 'litsSurcharges') {
                return (
            <section key={section.key} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="font-semibold">Lits surchargés</h2>
                <span className="text-sm text-gray-500">{totals.litsSurcharges + totals.litsConflits}</span>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Surcharges de capacité</h3>
                  {data.litsSurcharges.length ? (
                    <ul className="space-y-2">
                      {data.litsSurcharges.map((item) => (
                        <li key={item.id} className="rounded border px-3 py-2">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium">Lit #{item.id} {item.numero || ''} · {item.type_lit}</p>
                              <p className="text-sm text-gray-500">{item.nom_logement || 'Logement'} · {item.ville || 'N/A'} · occupants: {item.occupant_count}</p>
                            </div>
                            <Link href="/admin/lits" className="text-sm text-blue-600 hover:underline">Ouvrir les lits</Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-gray-500">Aucune surcharge détectée</p>}
                </div>
                <div>
                  <h3 className="font-medium mb-2">Conflits legacy / lit_occupants</h3>
                  {data.litsConflits.length ? (
                    <ul className="space-y-2">
                      {data.litsConflits.map((item) => (
                        <li key={item.id} className="rounded border px-3 py-2">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium">Lit #{item.id} {item.numero || ''} · {item.type_lit}</p>
                              <p className="text-sm text-gray-500">{item.nom_logement || 'Logement'} · {item.ville || 'N/A'} · occupation legacy + nouvelle table détectée</p>
                            </div>
                            <Link href="/admin/lits" className="text-sm text-blue-600 hover:underline">Synchroniser</Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-gray-500">Aucun conflit détecté</p>}
                </div>
              </div>
            </section>
                );
              }

              return (
            <section key={section.key} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="font-semibold">Lits en conflit</h2>
                <span className="text-sm text-gray-500">{totals.litsConflits}</span>
              </div>
              <div className="p-6">
                {data.litsConflits.length ? (
                  <ul className="space-y-2">
                    {data.litsConflits.map((item) => (
                      <li key={item.id} className="rounded border px-3 py-2">
                        <p className="font-medium">Lit #{item.id} {item.numero || ''} · {item.type_lit}</p>
                        <p className="text-sm text-gray-500">{item.nom_logement || 'Logement'} · {item.ville || 'N/A'} · occupation legacy + nouvelle table détectée</p>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-gray-500">Aucun conflit détecté</p>}
              </div>
            </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
