/**
 * Utilitaires pour la génération et gestion de mots de passe
 */

/**
 * Génère un mot de passe sécurisé aléatoire
 * Format: Minuscule, Majuscule, Chiffre, Spécial + longueur 12
 * Exemple: Abc123!@qw
 */
export function generatePassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*-_=+';

  // Assurer au moins 1 de chaque type
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Remplir le reste aléatoirement
  const allChars = lowercase + uppercase + numbers + special;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mélanger les caractères pour éviter les patterns
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Valide la force d'un mot de passe
 */
export function validatePasswordStrength(password: string): {
  strong: boolean;
  feedback: string[];
} {
  const feedback: string[] = [];
  
  if (password.length < 8) {
    feedback.push('Minimum 8 caractères requis');
  }
  if (!/[a-z]/.test(password)) {
    feedback.push('Ajoutez des lettres minuscules');
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('Ajoutez des lettres majuscules');
  }
  if (!/\d/.test(password)) {
    feedback.push('Ajoutez des chiffres');
  }
  if (!/[!@#$%^&*\-_=+]/.test(password)) {
    feedback.push('Ajoutez des caractères spéciaux (!@#$%^&*-_=+)');
  }

  return {
    strong: feedback.length === 0,
    feedback,
  };
}
