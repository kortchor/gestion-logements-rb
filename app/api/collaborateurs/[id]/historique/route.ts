import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collaborateurId = parseInt(id);

    const result = await query(
      `SELECT 
        b.id as bail_id,
        b.date_debut,
        b.date_fin,
        b.participation_mensuelle,
        b.chambre_privée,
        b.signe,
        b.created_at,
        l.id as logement_id,
        l.nom_logement,
        l.adresse as logement_adresse,
        l.ville as logement_ville,
        l.type as logement_type,
        l.type_occupation_effectif,
        ch.nom as chambre_nom,
        ch.type_lit,
        ch.nombre_lits as lits_dans_chambre,
        COUNT(li.id) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM lit_occupants lo
            WHERE lo.lit_id = li.id
              AND lo.collaborateur_id = b.collaborateur_id
          )
          OR li.collaborateur_id = b.collaborateur_id
        ) as nombre_lits_assignes
      FROM baux b
      LEFT JOIN logements l ON b.logement_id = l.id
      LEFT JOIN chambres ch ON ch.logement_id = l.id
      LEFT JOIN lits li ON li.chambre_id = ch.id
      WHERE b.collaborateur_id = $1
      GROUP BY b.id, l.id, ch.id
      ORDER BY b.date_debut DESC
      `,
      [collaborateurId]
    );

    const currentResult = await query(
      `WITH candidats AS (
         SELECT
           l.id,
           l.nom_logement,
           l.adresse,
           l.ville,
           l.type,
           ch.nom as chambre_nom,
           li.numero as lit_numero,
           b.participation_mensuelle,
           b.chambre_privée,
           b.date_debut,
           b.date_fin,
           1 AS priority,
           COALESCE(lo.created_at::date, CURRENT_DATE) AS date_ref
         FROM lit_occupants lo
         JOIN lits li ON li.id = lo.lit_id
         JOIN chambres ch ON ch.id = li.chambre_id
         JOIN logements l ON l.id = ch.logement_id
         LEFT JOIN baux b
           ON b.collaborateur_id = lo.collaborateur_id
          AND b.logement_id = l.id
          AND b.date_debut <= CURRENT_DATE
          AND COALESCE(b.date_fin, CURRENT_DATE + INTERVAL '10 years') >= CURRENT_DATE
         WHERE lo.collaborateur_id = $1

         UNION ALL

         SELECT
           l.id,
           l.nom_logement,
           l.adresse,
           l.ville,
           l.type,
           ch.nom as chambre_nom,
           li.numero as lit_numero,
           b.participation_mensuelle,
           b.chambre_privée,
           b.date_debut,
           b.date_fin,
           2 AS priority,
           CURRENT_DATE AS date_ref
         FROM lits li
         JOIN chambres ch ON ch.id = li.chambre_id
         JOIN logements l ON l.id = ch.logement_id
         LEFT JOIN baux b
           ON b.collaborateur_id = li.collaborateur_id
          AND b.logement_id = l.id
          AND b.date_debut <= CURRENT_DATE
          AND COALESCE(b.date_fin, CURRENT_DATE + INTERVAL '10 years') >= CURRENT_DATE
         WHERE li.collaborateur_id = $1
           AND COALESCE(li.est_occupe, false) = true
       )
       SELECT
         id,
         nom_logement,
         adresse,
         ville,
         type,
         chambre_nom,
         lit_numero,
         participation_mensuelle,
         chambre_privée,
         date_debut,
         date_fin
       FROM candidats
       ORDER BY priority ASC, date_ref DESC
       LIMIT 1
      `,
      [collaborateurId]
    );

    return NextResponse.json({
      success: true,
      data: {
        historique: result.rows,
        actuel: currentResult.rows[0] || null,
      },
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'historique' },
      { status: 500 }
    );
  }
}
