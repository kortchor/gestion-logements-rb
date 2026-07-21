import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ CORRECTION: Attendre la Promise params
    const { id } = await params;
    const collaborateurId = parseInt(id);
    
    if (isNaN(collaborateurId)) {
      return NextResponse.json(
        { error: 'ID de collaborateur invalide' },
        { status: 400 }
      );
    }

    console.log(`🔄 Désassignation du collaborateur ID: ${collaborateurId}`);

    // 1. Récupérer le logement du collaborateur
    const logementResult = await query(
      `SELECT DISTINCT ch.logement_id
       FROM lits l
       LEFT JOIN chambres ch ON l.chambre_id = ch.id
       WHERE l.collaborateur_id = $1 AND l.est_occupe = true`,
      [collaborateurId]
    );

    const logementId = logementResult.rows[0]?.logement_id;
    console.log(`📦 Logement ID: ${logementId}`);

    // 2. Désassigner le lit
    await query(
      'UPDATE lits SET est_occupe = false, collaborateur_id = NULL WHERE collaborateur_id = $1',
      [collaborateurId]
    );

    // 3. Fermer le bail actif associé
    const now = new Date().toISOString().split('T')[0];
    await query(
      `UPDATE baux SET date_fin = $1 WHERE collaborateur_id = $2 AND date_fin >= CURRENT_DATE`,
      [now, collaborateurId]
    );

    // 4. Si le logement est vide, redevient mixte
    if (logementId) {
      const occupantsResult = await query(
        `SELECT COUNT(*) as nb_occupants
         FROM lits l
         LEFT JOIN chambres ch ON l.chambre_id = ch.id
         WHERE ch.logement_id = $1 AND l.est_occupe = true`,
        [logementId]
      );

      const nbOccupants = parseInt(occupantsResult.rows[0]?.nb_occupants || '0');
      console.log(`👥 Nombre d'occupants restants: ${nbOccupants}`);

      if (nbOccupants === 0) {
        const mixteResult = await query(
          'SELECT mixte_autorise FROM logements WHERE id = $1',
          [logementId]
        );
        const mixteAutorise = mixteResult.rows[0]?.mixte_autorise || false;

        if (!mixteAutorise) {
          await query(
            'UPDATE logements SET type_occupation_effectif = $1 WHERE id = $2',
            ['mixte', logementId]
          );
          console.log(`✅ Logement ${logementId} redevient mixte`);
        }
      }
    }

    console.log(`✅ Collaborateur ${collaborateurId} désassigné avec succès`);
    return NextResponse.json(
      { success: true, message: 'Collaborateur désassigné avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la désassignation' },
      { status: 500 }
    );
  }
}