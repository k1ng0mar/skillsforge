import { SignJWT, jwtVerify } from 'jose';

const CLERK_JWKS_URL = 'https://clerk.dev/projects/prod_XXXXX/.well-known/jwks.json';

export async function verifyClerkToken(token) {
  const secret = new TextEncoder().encode(process.env.CLERK_SECRET_KEY || process.env.CLERK_PUBLISHABLE_KEY);
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload;
  } catch {
    const jwks = await fetch(CLERK_JWKS_URL).then(r => r.json());
    const pubKey = await import('jose').then(({ importSPKI }) =>
      importSPKI(jwks.keys?.[0]?.n ? jwks.keys[0] : '', 'RS256')
    );
    const { payload } = await jwtVerify(token, pubKey);
    return payload;
  }
}
