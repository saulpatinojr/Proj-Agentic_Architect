#!/usr/bin/env node

/**
 * Mints an ephemeral GitHub App installation access token for repository operations.
 * Uses only node:crypto and global fetch (zero external npm dependencies).
 *
 * Environment variables:
 *   GITHUB_APP_ID           - The GitHub App ID
 *   GITHUB_APP_PRIVATE_KEY  - The RSA private key (PEM format)
 *   GITHUB_REPOSITORY       - The owner/repo string (e.g. saulpatinojr/Proj-Agentic_Architect)
 *   GITHUB_APP_PERMISSIONS  - (Optional) JSON string of scoped permissions
 */

import { createSign } from 'node:crypto';

function base64UrlEncode(data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(typeof data === 'string' ? data : JSON.stringify(data));
  return buf.toString('base64url');
}

function generateJwt(appId, privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iat: now - 60,
    exp: now + 10 * 60,
    iss: appId.trim(),
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign('RSA-SHA256');
  signer.update(dataToSign);
  signer.end();

  const signature = signer.sign(privateKeyPem, 'base64url');
  return `${dataToSign}.${signature}`;
}

async function main() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const repository = process.env.GITHUB_REPOSITORY;
  const permissionsRaw = process.env.GITHUB_APP_PERMISSIONS;

  if (!appId || !privateKey || !repository) {
    console.error('Missing required environment variables: GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, or GITHUB_REPOSITORY.');
    process.exit(1);
  }

  const jwt = generateJwt(appId, privateKey);
  const headers = {
    Authorization: `Bearer ${jwt}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'code-conductor-copilot-mcp-token-minter',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // 1. Resolve installation for this repository
  const installRes = await fetch(`https://api.github.com/repos/${repository}/installation`, {
    headers,
  });

  if (!installRes.ok) {
    const text = await installRes.text();
    console.error(`Failed to resolve installation for ${repository}: ${installRes.status} ${text}`);
    process.exit(1);
  }

  const installData = await installRes.json();
  const installationId = installData.id;

  // 2. Mint installation token
  const body = {};
  if (permissionsRaw) {
    try {
      body.permissions = JSON.parse(permissionsRaw);
    } catch (err) {
      console.error('Failed to parse GITHUB_APP_PERMISSIONS JSON:', err);
      process.exit(1);
    }
  }

  const tokenRes = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error(`Failed to mint installation token: ${tokenRes.status} ${text}`);
    process.exit(1);
  }

  const tokenData = await tokenRes.json();
  if (!tokenData.token) {
    console.error('No token in response:', tokenData);
    process.exit(1);
  }

  process.stdout.write(tokenData.token);
}

main().catch((err) => {
  console.error('Fatal error in token minter:', err);
  process.exit(1);
});
