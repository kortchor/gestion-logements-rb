import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// ✅ GET - Récupérer un logement
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    const result = await query(
      `SELECT l.*, 
              COUNT(c.id) as nombre_chambres,
              COALESCE(SUM(c.nombre_lits), 0) as total_lits
       FROM logements l
       LEFT JOIN chambres c ON l.id = c.logement_id
       WHERE l.id = $1
       GROUP BY l.id`,
      [id]
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

// ✅ PUT - Modifier un logement
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    console.log('📦 Données reçues pour modification:', body);

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
      est_visible,
      mixte_autorise,
      description_detaillee,
      chambres,
    } = body;

    // 1. Mettre à jour le logement
    await query(
      `UPDATE logements 
       SET nom_logement = $1, adresse = $2, ville = $3, type = $4, 
           prix_loyer = $5, proprietaire = $6, contact_proprietaire = $7,
           fournisseur_edf = $8, fournisseur_eau = $9, fournisseur_gaz = $10,
           nom_assureur = $11, assurance = $12, assurance_pdf = $13, assurance_nom = $14,
           bail_pdf = $15, bail_nom = $16, 
           etat_lieux_pdf = $17, etat_lieux_nom = $18, etat_lieux_photos = $19,
           est_visible = $20, mixte_autorise = $21, description_detaillee = $22
       WHERE id = $23`,
      [
        nom_logement || null,
        adresse,
        ville,
        type,
        prix_loyer ? parseFloat(prix_loyer) : null,
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
        est_visible !== undefined ? est_visible : true,
        mixte_autorise || false,
        description_detaillee || null,
        id
      ]
    );

    // 2. Mettre à jour les chambres (supprimer les anciennes et recréer)
    if (chambres && chambres.length > 0) {
      // Supprimer les anciennes chambres (et leurs lits)
      await query('DELETE FROM chambres WHERE logement_id = $1', [id]);
      
      // Recréer les chambres et les lits
      for (const chambre of chambres) {
        const chambreResult = await query(
          `INSERT INTO chambres (logement_id, nom, type_lit, nombre_lits)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [id, chambre.nom, chambre.type_lit || 'simple', chambre.nombre_lits || 1]
        );
        
        const chambreId = chambreResult.rows[0].id;
        const nombreLits = chambre.nombre_lits || 1;
        
        for (let i = 1; i <= nombreLits; i++) {
          await query(
            'INSERT INTO lits (chambre_id, numero, est_occupe) VALUES ($1, $2, false)',
            [chambreId, i.toString()]
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur PUT:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification' },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Supprimer un logement
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    const checkResult = await query(
      'SELECT id FROM logements WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Logement non trouvé' },
        { status: 404 }
      );
    }
    
    await query('DELETE FROM logements WHERE id = $1', [id]);
    
    return NextResponse.json(
      { success: true, message: 'Logement supprimé avec succès' },
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