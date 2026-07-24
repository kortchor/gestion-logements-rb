import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// ✅ GET - Récupérer un logement avec ses chambres
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logementId = parseInt(id);

    if (isNaN(logementId)) {
      return NextResponse.json(
        { error: 'ID de logement invalide' },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT * FROM logements WHERE id = $1`,
      [logementId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Logement non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Erreur GET:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

// ✅ PUT - Mettre à jour un logement
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logementId = parseInt(id);

    if (isNaN(logementId)) {
      return NextResponse.json(
        { error: 'ID de logement invalide' },
        { status: 400 }
      );
    }

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

    // Mettre à jour le logement
    await query(
      `UPDATE logements 
       SET nom_logement = $1, adresse = $2, ville = $3, type = $4, prix_loyer = $5,
           proprietaire = $6, contact_proprietaire = $7,
           fournisseur_edf = $8, fournisseur_eau = $9, fournisseur_gaz = $10,
           nom_assureur = $11, assurance = $12, assurance_pdf = $13, assurance_nom = $14,
           bail_pdf = $15, bail_nom = $16,
           etat_lieux_pdf = $17, etat_lieux_nom = $18, etat_lieux_photos = $19,
           date_debut_contrat = $20, date_fin_contrat = $21,
           est_visible = $22, mixte_autorise = $23, description_detaillee = $24
       WHERE id = $25`,
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
        logementId,
      ]
    );

    // Mettre à jour les chambres (supprimer et recréer)
    await query('DELETE FROM chambres WHERE logement_id = $1', [logementId]);

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

    return NextResponse.json({ success: true, message: 'Logement mis à jour' });
  } catch (error) {
    console.error('❌ Erreur PUT:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}