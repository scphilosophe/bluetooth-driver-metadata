import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { verifyManifest } from '../lib/signing.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const serviceRoot = path.resolve(here, '..');
const repositoryRoot = path.resolve(serviceRoot, '..');

test('published metadata has a valid detached signature', async () => {
  const [manifest, signature, publicKey] = await Promise.all([
    readFile(path.join(serviceRoot, 'public', 'intel-bluetooth.json')),
    readFile(path.join(serviceRoot, 'public', 'intel-bluetooth.json.sig'), 'utf8'),
    readFile(path.join(repositoryRoot, 'config', 'metadata-public.pem'), 'utf8')
  ]);

  assert.equal(verifyManifest(manifest, signature, publicKey), true);
  const parsed = JSON.parse(manifest.toString('utf8'));
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.product, 'intel-wireless-bluetooth');
  assert.ok(Array.isArray(parsed.packages) && parsed.packages.length > 0);
});
