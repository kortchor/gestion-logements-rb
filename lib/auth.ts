import jwt from 'jsonwebtoken';
import { SignJWT, jwtVerify } from 'jose';

export interface TokenPayload {
  id: number;
  email: string;
  role: string;
  nom: string;
  prenom: string;
}

const secretKey = process.env.JWT_SECRET!;
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, { algorithms: ['HS256'] });
    return payload;
  } catch (e) { return null; }
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
