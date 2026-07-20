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
