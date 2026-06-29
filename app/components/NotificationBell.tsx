'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: number;
  type: string;
  message: string;
  lien: string;
  est_lue: boolean;
  created_at: string;
  nom: string;
  prenom: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nonLues, setNonLues] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?non_lues=true&limit=20');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data);
        setNonLues(data.data.filter((n: Notification) => !n.est_lue).length);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const marquerCommeLue = async (id: number) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications(notifications.map((n) =>
        n.id === id ? { ...n, est_lue: true } : n
      ));
      setNonLues(nonLues - 1);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const supprimerNotification = async (id: number) => {
    try {
      await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
      setNotifications(notifications.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const toutMarquerCommeLu = async () => {
    const nonLuesIds = notifications.filter((n) => !n.est_lue).map((n) => n.id);
    for (const id of nonLuesIds) {
      await marquerCommeLue(id);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'fin_bail':
        return '📅';
      case 'assignation':
        return '🏠';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative">
      {/* Bouton cloche */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {nonLues > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {nonLues}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
            <h3 className="font-semibold text-gray-700">🔔 Notifications</h3>
            {nonLues > 0 && (
              <button
                onClick={toutMarquerCommeLu}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-4 text-center text-gray-500">Chargement...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg">📭</p>
              <p>Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 hover:bg-gray-50 transition-colors ${
                    !notif.est_lue ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        if (!notif.est_lue) marquerCommeLue(notif.id);
                        if (notif.lien) {
                          router.push(notif.lien);
                          setOpen(false);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getIcon(notif.type)}</span>
                        <span className="font-medium text-sm">
                          {notif.prenom} {notif.nom}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notif.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => supprimerNotification(notif.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  {!notif.est_lue && (
                    <div className="mt-1">
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}