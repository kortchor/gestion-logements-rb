import { query } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { getFinBailEmailTemplate } from '@/lib/emailTemplates';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const joursAlerte = parseInt(searchParams.get('jours') || '30');
    const typeAlerte = searchParams.get('type') || 'premiere';

    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + joursAlerte);

    const result = await query(
      `SELECT 
        b.id as bail_id,
        c.id as collaborateur_id,
        c.nom,
        c.prenom,
        c.email,
        log.adresse as logement_adresse,
        log.ville as logement_ville,
        b.date_fin,
        b.alerte_envoyee,
        b.date_alerte_envoyee
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
    let notificationsCreees = 0;

    const getMessage = (type: string, jours: number, prenom: string, nom: string, dateFin: string) => {
      const dateFinFormatee = new Date(dateFin).toLocaleDateString('fr-FR');
      const messages: Record<string, string> = {
        'premiere': `⚠️ Le bail de ${prenom} ${nom} se termine dans ${jours} jours (${dateFinFormatee}).`,
        'relance': `🔔 RELANCE : Le bail de ${prenom} ${nom} se termine dans ${jours} jours (${dateFinFormatee}).`,
        'derniere': `🚨 URGENT : Le bail de ${prenom} ${nom} se termine dans ${jours} jours (${dateFinFormatee}). Action requise !`,
        'quotidienne': `⏰ Le bail de ${prenom} ${nom} se termine aujourd'hui (${dateFinFormatee}).`,
      };
      return messages[type] || messages['premiere'];
    };

    for (const bail of baux) {
      const joursRestants = Math.ceil((new Date(bail.date_fin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      if (typeAlerte === 'premiere' && joursRestants > 30) {
        continue;
      }

      const message = getMessage(typeAlerte, joursRestants, bail.prenom, bail.nom, bail.date_fin);

      const template = getFinBailEmailTemplate({
        collaborateurNom: bail.nom,
        collaborateurPrenom: bail.prenom,
        logementAdresse: bail.logement_adresse,
        dateFin: bail.date_fin,
        joursRestants: joursRestants,
        typeAlerte: typeAlerte,
      });

      const emailResult = await sendEmail({
        to: bail.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (emailResult.success) {
        emailsEnvoyes++;
        
        if (typeAlerte === 'premiere') {
          await query(
            `UPDATE baux 
             SET alerte_envoyee = true, 
                 date_alerte_envoyee = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [bail.bail_id]
          );
        }

        await query(
          `INSERT INTO notifications 
           (collaborateur_id, type, message, lien, date_envoi)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [
            bail.collaborateur_id,
            'fin_bail',
            message,
            `/collaborateurs/${bail.collaborateur_id}`
          ]
        );
        notificationsCreees++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${emailsEnvoyes} email(s) d'alerte envoyé(s)`,
      emails_envoyes: emailsEnvoyes,
      notifications_creees: notificationsCreees,
      baux_traites: baux.length,
      type_alerte: typeAlerte,
      jours_alerte: joursAlerte,
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi des emails' },
      { status: 500 }
    );
  }
}