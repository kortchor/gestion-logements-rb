'use client';

import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isSuperAdmin = user.role === 'super_admin';
  const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'admin_readonly';
  const isReadOnly = user.role === 'admin_readonly';
  const isSimpleUser = user.role === 'user';

  const roleLabel = isSuperAdmin
    ? 'Super administrateur'
    : isReadOnly
      ? 'Administrateur en lecture'
      : isAdmin
        ? 'Administrateur'
        : 'Utilisateur';

  const quickActions = isAdmin
    ? [
        { href: '/dashboard', title: 'Tableau de bord', description: 'Suivre les coûts, les logements et les baux.' },
        { href: '/recherche', title: 'Recherche globale', description: 'Retrouver un logement, un lit ou un collaborateur.' },
        { href: '/admin/anomalies', title: 'Anomalies à corriger', description: 'Identifier les données à revoir en priorité.' },
        { href: '/admin/modeles', title: 'Modèles', description: 'Ouvrir les conventions et documents prêts à l’emploi.' },
      ]
    : [
        { href: '/mon-espace', title: 'Mon espace', description: 'Consulter votre logement et l’état des lieux.' },
      ];

  return (
    <div className="space-y-8 pb-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 shadow-[0_24px_90px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="relative isolate overflow-hidden px-6 py-10 sm:px-8 lg:px-10 lg:py-14">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(30,41,59,0.92))]" />
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />
            <div className="relative z-10 max-w-3xl text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                Portail opérationnel · {roleLabel}
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Bonjour {user.prenom}, tout ce qu&apos;il faut est déjà au bon endroit.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
                Suivi des logements, collaborateurs, coûts, anomalies et documents: le logiciel est pensé pour vous donner le bon écran en deux clics, sans dépendre d&apos;une explication extérieure.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={isAdmin ? '/dashboard' : '/mon-espace'} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg transition-transform hover:-translate-y-0.5">
                  {isAdmin ? 'Ouvrir le dashboard' : 'Ouvrir mon espace'}
                </Link>
                {isAdmin && (
                  <Link href="/admin/anomalies" className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-transform hover:-translate-y-0.5 hover:bg-white/15">
                    Voir les anomalies
                  </Link>
                )}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Navigation</p>
                  <p className="mt-2 text-sm text-slate-200">Les accès clés sont regroupés dans le header pour éviter de chercher.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Données</p>
                  <p className="mt-2 text-sm text-slate-200">Les vues montrent les écarts, les états et les actions utiles immédiatement.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Confiance</p>
                  <p className="mt-2 text-sm text-slate-200">Les écrans prioritaires sont orientés correction, pas uniquement consultation.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-8 sm:px-8 lg:border-l lg:border-t-0 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Accès rapide</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Ce que vous devez ouvrir</h2>
              </div>
              <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">4 actions</span>
            </div>

            <div className="mt-5 grid gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-slate-950">{action.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{action.description}</p>
                    </div>
                    <span className="mt-0.5 text-slate-300 transition-transform group-hover:translate-x-0.5">→</span>
                  </div>
                </Link>
              ))}
            </div>

            {isSimpleUser && (
              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-semibold">Votre point d’entrée</p>
                <p className="mt-1 leading-6">Consultez votre espace pour retrouver le logement actif, les informations utiles et l’état des lieux en quelques secondes.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
