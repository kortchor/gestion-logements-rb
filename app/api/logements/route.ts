import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// ✅ GET - Récupérer tous les logements ou un seul avec ?id=
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const result = await query(
        `SELECT 
          l.*,
          COUNT(c.id) as nombre_chambres,
          COALESCE(SUM(c.nombre_lits), 0) as total_lits
         FROM logements l
         LEFT JOIN chambres c ON l.id = c.logement_id
         WHERE l.id = $1
         GROUP BY l.id`,
        [parseInt(id)]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Logement non trouvé' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ success: true, data: result.rows[0] });
    }

    const result = await query(`
      SELECT 
        l.*,
        COUNT(c.id) as nombre_chambres,
        COALESCE(SUM(c.nombre_lits), 0) as total_lits
      FROM logements l
      LEFT JOIN chambres c ON l.id = c.logement_id
      GROUP BY l.id
      ORDER BY l.id
    `);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Erreur GET:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

// ✅ POST - Créer un logement avec ses chambres
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      nom_logement,
      adresse,
      ville,
      type,
      prix_loyer,
      proprietaire,
      contact_proprietaire,
      fournisseur_edf,
      fournisseur_eau,
      fournisseur_gaz,
      nom_assureur,
      assurance,
      assurance_pdf,
      assurance_nom,
      bail_pdf,
      bail_nom,
      etat_lieux_pdf,
      etat_lieux_nom,
      etat_lieux_photos,
      date_debut_contrat,
      date_fin_contrat,
      est_visible,
      mixte_autorise,
      description_detaillee,
      chambres,
    } = body;

    // Insérer le logement
    const result = await query(
      `INSERT INTO logements (
        nom_logement, adresse, ville, type, prix_loyer,
        proprietaire, contact_proprietaire,
        fournisseur_edf, fournisseur_eau, fournisseur_gaz,
        nom_assureur, assurance, assurance_pdf, assurance_nom,
        bail_pdf, bail_nom,
        etat_lieux_pdf, etat_lieux_nom, etat_lieux_photos,
        date_debut_contrat, date_fin_contrat,
        est_visible, mixte_autorise, description_detaillee
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING id`,
      [
        nom_logement || null,
        adresse,
        ville,
        type,
        prix_loyer || null,
        proprietaire || null,
        contact_proprietaire || null,
        fournisseur_edf || null,
        fournisseur_eau || null,
        fournisseur_gaz || null,
        nom_assureur || null,
        assurance || null,
        assurance_pdf || null,
        assurance_nom || null,
        bail_pdf || null,
        bail_nom || null,
        etat_lieux_pdf || null,
        etat_lieux_nom || null,
        etat_lieux_photos || null,
        date_debut_contrat || null,
        date_fin_contrat || null,
        est_visible !== undefined ? est_visible : true,
        mixte_autorise || false,
        description_detaillee || null,
      ]
    );

    const logementId = result.rows[0].id;

    // Insérer les chambres ET créer les lits automatiquement
    if (chambres && chambres.length > 0) {
      for (const chambre of chambres) {
        // Créer la chambre
        const chambreResult = await query(
          `INSERT INTO chambres (logement_id, nom, type_lit, nombre_lits)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [logementId, chambre.nom, chambre.type_lit, chambre.nombre_lits || 1]
        );

        const chambreId = chambreResult.rows[0].id;

        // Créer les lits automatiquement
        const nombreLits = chambre.nombre_lits || 1;
        for (let i = 1; i <= nombreLits; i++) {
          await query(
            `INSERT INTO lits (chambre_id, numero, type_lit)
             VALUES ($1, $2, $3)`,
            [chambreId, `${chambre.nom}-L${i}`, chambre.type_lit]
          );
        }
      }
    }

    return NextResponse.json(
      { success: true, id: logementId },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Erreur POST:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Supprimer un logement
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID du logement requis' },
        { status: 400 }
      );
    }

    const logementId = parseInt(id);

    const checkResult = await query(
      'SELECT id FROM logements WHERE id = $1',
      [logementId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Logement non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer les chambres (CASCADE gère les lits)
    await query('DELETE FROM chambres WHERE logement_id = $1', [logementId]);
    await query('DELETE FROM logements WHERE id = $1', [logementId]);

    return NextResponse.json(
      { success: true, message: 'Logement supprimé' },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Erreur DELETE:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}