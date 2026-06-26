import { query } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { getFinBailEmailTemplate } from '@/lib/emailTemplates';
import { NextResponse } from 'next/server';

// Route pour vérifier les baux arrivant à échéance
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moisAlerte = parseInt(searchParams.get('mois') || '4');

    // Calculer la date dans X mois
    const dateLimite = new Date();
    dateLimite.setMonth(dateLimite.getMonth() + moisAlerte);

    // Récupérer les baux qui arrivent à échéance
    const result = await query(
      `SELECT 
        c.id as collaborateur_id,
        c.nom,
        c.prenom,
        c.email,
        log.adresse as logement_adresse,
        b.date_fin
       FROM baux b
       LEFT JOIN collaborateurs c ON b.collaborateur_id = c.id
       LEFT JOIN logements log ON b.logement_id = log.id
       WHERE b.date_fin <= $1
         AND b.date_fin > CURRENT_DATE
         AND b.alerte_envoyee = false`,
      [dateLimite.toISOString().split('T')[0]]
    );

    const baux = result.rows;
    let emailsEnvoyes = 0;

    for (const bail of baux) {
      const template = getFinBailEmailTemplate({
        collaborateurNom: bail.nom,
        collaborateurPrenom: bail.prenom,
        logementAdresse: bail.logement_adresse,
        dateFin: bail.date_fin,
      });

      const emailResult = await sendEmail({
        to: bail.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (emailResult.success) {
        emailsEnvoyes++;
        // Marquer l'alerte comme envoyée
        await query(
          'UPDATE baux SET alerte_envoyee = true WHERE collaborateur_id = $1 AND date_fin = $2',
          [bail.collaborateur_id, bail.date_fin]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `${emailsEnvoyes} email(s) d'alerte envoyé(s)`,
      baux_traites: baux.length,
      emails_envoyes: emailsEnvoyes,
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi des emails' },
      { status: 500 }
    );
  }
}