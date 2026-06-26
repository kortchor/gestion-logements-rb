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
      est_visible,
      mixte_autorise,
      description_detaillee,
    } = body;

    await query(
      `UPDATE logements 
       SET nom_logement = $1, adresse = $2, ville = $3, type = $4, 
           prix_loyer = $5, proprietaire = $6, contact_proprietaire = $7,
           est_visible = $8, mixte_autorise = $9, description_detaillee = $10
       WHERE id = $11`,
      [
        nom_logement || null,
        adresse,
        ville,
        type,
        prix_loyer ? parseFloat(prix_loyer) : null,
        proprietaire || null,
        contact_proprietaire || null,
        est_visible !== undefined ? est_visible : true,
        mixte_autorise || false,
        description_detaillee || null,
        id
      ]
    );

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
    
    // Vérifier si le logement existe
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
    
    // Supprimer le logement (les chambres et lits seront supprimés automatiquement grâce à ON DELETE CASCADE)
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