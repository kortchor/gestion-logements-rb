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

// ✅ Cette fonction remplace l'ancienne `verifyToken` et `decrypt`. Elle est compatible partout.
export async function verifyToken(input: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(input, key, { algorithms: ['HS256'] });
    return payload as TokenPayload;
  } catch (error) {
    console.error('❌ Erreur de vérification du token:', error);
    return null;
  }
}
