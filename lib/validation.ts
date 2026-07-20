/**
 * Utilitaires de validation simples pour valider les entrées utilisateur
 * (Alternative légère à Zod pour éviter dépendances externes)
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Schéma de validation pour le login
 */
export const loginSchema = {
  validate: (data: any): ValidationResult<{ email: string; mot_de_passe: string }> => {
    const errors: ValidationError[] = [];

    // Vérifier email
    if (!data?.email || typeof data.email !== 'string') {
      errors.push({ field: 'email', message: 'Email requis' });
    } else if (!isValidEmail(data.email)) {
      errors.push({ field: 'email', message: 'Format email invalide' });
    } else if (data.email.length > 255) {
      errors.push({ field: 'email', message: 'Email trop long (max 255 caractères)' });
    }

    // Vérifier mot de passe
    if (!data?.mot_de_passe || typeof data.mot_de_passe !== 'string') {
      errors.push({ field: 'mot_de_passe', message: 'Mot de passe requis' });
    } else if (data.mot_de_passe.length < 4) {
      errors.push({ field: 'mot_de_passe', message: 'Mot de passe trop court' });
    } else if (data.mot_de_passe.length > 256) {
      errors.push({ field: 'mot_de_passe', message: 'Mot de passe trop long' });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        email: data.email.toLowerCase().trim(),
        mot_de_passe: data.mot_de_passe,
      },
    };
  },
};

/**
 * Schéma de validation pour la création de collaborateur
 */
export const createCollaborateurSchema = {
  validate: (data: any): ValidationResult<any> => {
    const errors: ValidationError[] = [];

    // Nom
    if (!data?.nom || typeof data.nom !== 'string' || data.nom.trim().length === 0) {
      errors.push({ field: 'nom', message: 'Nom requis' });
    } else if (data.nom.length > 100) {
      errors.push({ field: 'nom', message: 'Nom trop long (max 100 caractères)' });
    }

    // Prénom
    if (!data?.prenom || typeof data.prenom !== 'string' || data.prenom.trim().length === 0) {
      errors.push({ field: 'prenom', message: 'Prénom requis' });
    } else if (data.prenom.length > 100) {
      errors.push({ field: 'prenom', message: 'Prénom trop long (max 100 caractères)' });
    }

    // Email
    if (!data?.email || typeof data.email !== 'string') {
      errors.push({ field: 'email', message: 'Email requis' });
    } else if (!isValidEmail(data.email)) {
      errors.push({ field: 'email', message: 'Format email invalide' });
    } else if (data.email.length > 255) {
      errors.push({ field: 'email', message: 'Email trop long (max 255 caractères)' });
    }

    // Téléphone (optionnel mais doit être valide si fourni)
    if (data?.telephone && typeof data.telephone === 'string') {
      if (data.telephone.length > 20) {
        errors.push({ field: 'telephone', message: 'Téléphone trop long (max 20 caractères)' });
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        nom: data.nom.trim(),
        prenom: data.prenom.trim(),
        email: data.email.toLowerCase().trim(),
        telephone: data.telephone?.trim() || null,
        genre: data.genre || null,
        date_arrivee: data.date_arrivee || null,
        date_depart: data.date_depart || null,
        date_debut_contrat: data.date_debut_contrat || null,
        date_fin_contrat: data.date_fin_contrat || null,
        vehicule: Boolean(data.vehicule),
        animal: Boolean(data.animal),
        commentaire: data.commentaire?.trim() || null,
        centre_principal: data.centre_principal?.trim() || null,
        centre_affectation: data.centre_affectation?.trim() || null,
      },
    };
  },
};

/**
 * Schéma de validation pour la création de logement
 */
export const createLogementSchema = {
  validate: (data: any): ValidationResult<any> => {
    const errors: ValidationError[] = [];

    // Nom logement
    if (!data?.nom_logement || typeof data.nom_logement !== 'string' || data.nom_logement.trim().length === 0) {
      errors.push({ field: 'nom_logement', message: 'Nom du logement requis' });
    } else if (data.nom_logement.length > 200) {
      errors.push({ field: 'nom_logement', message: 'Nom trop long (max 200 caractères)' });
    }

    // Adresse
    if (!data?.adresse || typeof data.adresse !== 'string' || data.adresse.trim().length === 0) {
      errors.push({ field: 'adresse', message: 'Adresse requise' });
    } else if (data.adresse.length > 300) {
      errors.push({ field: 'adresse', message: 'Adresse trop longue (max 300 caractères)' });
    }

    // Ville
    if (!data?.ville || typeof data.ville !== 'string' || data.ville.trim().length === 0) {
      errors.push({ field: 'ville', message: 'Ville requise' });
    } else if (data.ville.length > 100) {
      errors.push({ field: 'ville', message: 'Ville trop longue (max 100 caractères)' });
    }

    // Type
    if (data?.type && typeof data.type === 'string') {
      if (data.type.length > 50) {
        errors.push({ field: 'type', message: 'Type trop long (max 50 caractères)' });
      }
    }

    // Prix loyer (optionnel mais doit être un nombre)
    if (data?.prix_loyer !== undefined && data.prix_loyer !== null) {
      if (typeof data.prix_loyer !== 'number' || data.prix_loyer < 0) {
        errors.push({ field: 'prix_loyer', message: 'Prix de loyer invalide (doit être positif)' });
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        nom_logement: data.nom_logement.trim(),
        adresse: data.adresse.trim(),
        ville: data.ville.trim(),
        type: data.type?.trim() || null,
        prix_loyer: data.prix_loyer || null,
        proprietaire: data.proprietaire?.trim() || null,
        contact_proprietaire: data.contact_proprietaire?.trim() || null,
        description_detaillee: data.description_detaillee?.trim() || null,
        est_visible: Boolean(data.est_visible),
        mixte_autorise: Boolean(data.mixte_autorise),
      },
    };
  },
};

/**
 * Helper pour valider un email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper pour nettoyer les données XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Supprimer < et >
    .trim();
}
