/**
 * One-time Convex Auth setup for a deployment: generates the RS256 signing key
 * pair and stores JWT_PRIVATE_KEY, JWKS and SITE_URL as Convex environment
 * variables. Safe to re-run; it replaces the keys (signing everyone out).
 *
 *   npm run setup:auth                                         # dev deployment, SITE_URL=http://localhost:5173
 *   SITE_URL=https://app.example.com npm run setup:auth -- --prod   # production deployment
 */
import { spawnSync } from 'node:child_process';
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';

const siteUrl = process.env.SITE_URL ?? 'http://localhost:5173';
const target = process.argv.includes('--prod') ? ['--prod'] : [];
const keys = await generateKeyPair('RS256', { extractable: true });
const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, ' ');
const jwks = JSON.stringify({ keys: [{ use: 'sig', ...(await exportJWK(keys.publicKey)) }] });

for (const [name, value] of Object.entries({ JWT_PRIVATE_KEY: privateKey, JWKS: jwks, SITE_URL: siteUrl })) {
  // `--` stops the CLI from reading "-----BEGIN PRIVATE KEY-----" as a flag.
  const result = spawnSync('npx', ['convex', 'env', 'set', ...target, name, '--', value], { stdio: ['ignore', 'ignore', 'inherit'] });
  if (result.status !== 0) {
    console.error(`Failed to set ${name}. Is \`npx convex dev\` configured for this project?`);
    process.exit(1);
  }
  console.log(`✔ ${name} set`);
}
