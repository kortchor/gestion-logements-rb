import jwt from 'jsonwebtoken';

export interface TokenPayload {
  id: number;
  email: string;
  role: string;
  nom: string;
  prenom: string;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    console.log('🔐 Vérification du token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    console.log('✅ Token valide:', decoded);
    return decoded;
  } catch (error) {
    console.error('❌ Erreur de vérification du token:', error);
    return null;
  }
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
}
