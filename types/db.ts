/**
 * Ce fichier contient les interfaces TypeScript pour les objets de la base de données.
 */

export interface CollaborateurDb {
  nom: string;
  prenom: string;
  email: string;
  mot_de_passe: string | null;
}