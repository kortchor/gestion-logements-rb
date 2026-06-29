'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import ChartCard from './ChartCard';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

interface ChartsData {
  logementsParVille: { ville: string; count: number }[];
  litsParVille: { ville: string; occupes: number; disponibles: number }[];
  assignationsParMois: { mois: string; count: number }[];
  collaborateursParCentre: { centre: string; count: number }[];
  occupationParType: { type: string; count: number }[];
}

const COLORS = {
  Cassis: '#ec4899',
  'La Ciotat': '#22c55e',
  Marseille: '#eab308',
  'Roquefort-la-Bédoule': '#3b82f6',
};

export default function Charts({ data }: { data: ChartsData }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6">
            <div className="h-64 bg-gray-100 animate-pulse rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // 1. Graphique : Répartition par ville (Doughnut)
  const villesData = {
    labels: data.logementsParVille.map((item) => item.ville),
    datasets: [
      {
        label: 'Logements',
        data: data.logementsParVille.map((item) => item.count),
        backgroundColor: data.logementsParVille.map(
          (item) => COLORS[item.ville as keyof typeof COLORS] || '#6b7280'
        ),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // 2. Graphique : Taux d'occupation par ville (Bar)
  const occupationData = {
    labels: data.litsParVille.map((item) => item.ville),
    datasets: [
      {
        label: 'Lits occupés',
        data: data.litsParVille.map((item) => item.occupes),
        backgroundColor: '#3b82f6',
        borderRadius: 4,
      },
      {
        label: 'Lits disponibles',
        data: data.litsParVille.map((item) => item.disponibles),
        backgroundColor: '#22c55e',
        borderRadius: 4,
      },
    ],
  };

  // 3. Graphique : Évolution des assignations (Line)
  const evolutionData = {
    labels: data.assignationsParMois.map((item) => item.mois),
    datasets: [
      {
        label: 'Assignations',
        data: data.assignationsParMois.map((item) => item.count),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
      },
    ],
  };

  // 4. Graphique : Répartition par centre (Doughnut)
  const centresData = {
    labels: data.collaborateursParCentre.map((item) => item.centre),
    datasets: [
      {
        label: 'Collaborateurs',
        data: data.collaborateursParCentre.map((item) => item.count),
        backgroundColor: ['#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // 5. Graphique : Occupation par type (Bar)
  const typeData = {
    labels: data.occupationParType.map((item) => item.type),
    datasets: [
      {
        label: 'Nombre de logements',
        data: data.occupationParType.map((item) => item.count),
        backgroundColor: ['#8b5cf6', '#ec4899', '#3b82f6', '#6b7280'],
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            size: 12,
          },
          padding: 20,
        },
      },
    },
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Première ligne : 2 graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="🏠 Répartition par ville">
          <Doughnut data={villesData} options={chartOptions} />
        </ChartCard>

        <ChartCard title="🏢 Répartition par centre">
          {data.collaborateursParCentre.length > 0 ? (
            <Doughnut data={centresData} options={chartOptions} />
          ) : (
            <p className="text-gray-500 text-sm">Aucun centre renseigné</p>
          )}
        </ChartCard>
      </div>

      {/* Deuxième ligne : 2 graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="📈 Taux d'occupation par ville">
          <Bar data={occupationData} options={barOptions} />
        </ChartCard>

        <ChartCard title="📊 Type d'occupation">
          <Bar data={typeData} options={barOptions} />
        </ChartCard>
      </div>

      {/* Troisième ligne : 1 graphique en pleine largeur */}
      <div className="grid grid-cols-1 gap-6">
        <ChartCard title="📈 Évolution des assignations">
          {data.assignationsParMois.length > 1 ? (
            <Line data={evolutionData} options={chartOptions} />
          ) : (
            <p className="text-gray-500 text-sm">Pas assez de données pour l'évolution</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}