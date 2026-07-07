import jwt from 'jsonwebtoken';

export interface TokenPayload {
  id: number;
  email: string;
  role: string;
  nom: string;
  prenom: string;
}

export function verifyToken(token: string): Promise<TokenPayload | null> {
  return new Promise((resolve) => {
    try {
      console.log('🔐 Vérification du token...');
      console.log('Token:', token.substring(0, 30) + '...');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
      console.log('✅ Token valide:', decoded);
      resolve(decoded);
    } catch (error) {
      console.error('❌ Erreur de vérification du token:', error);
      resolve(null);
    }
  });
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
}