import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';

export async function verifyClerkToken(token) {
  const jwksUrl = process.env.CLERK_JWKS_URL;
  if (!jwksUrl) throw new Error('CLERK_JWKS_URL not configured');

  const JWKS = createRemoteJWKSet(new URL(jwksUrl));
  const { payload } = await jwtVerify(token, JWKS, { algorithms: ['RS256'] });
  return payload;
}
