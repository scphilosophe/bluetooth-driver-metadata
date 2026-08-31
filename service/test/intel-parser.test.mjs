import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { expectedDriverVersions, packagesAgree, parseIntelPage } from '../lib/intel-parser.mjs';
import { serializeManifest, signManifest, verifyManifest } from '../lib/signing.mjs';

const route = {
  key: 'current',
  name: 'Current Intel Bluetooth package',
  endOfLife: false,
  models: ['9560', 'AX210'],
  fallbackDriverVersions: {}
};

const html = `
<html><body>
<button data-href="https://downloadmirror.intel.com/925350/BT-24.60.0-64UWD-Win10-Win11.exe">Download</button>
<div>Size: 62.1 MB SHA256: 75E4AB9F4767E4201490C11A0C6F9664D1E50B8046FF8BB498B6538B4C8DDE05</div>
<p>Driver version 24.40.11.1 : For AX411, AX210, 9560, 9462</p>
</body></html>`;

test('parses the official Intel package fields and 9560 mapping', () => {
  const item = parseIntelPage(html, route, 'https://www.intel.com/example.html');
  assert.equal(item.packageVersion, '24.60.0');
  assert.equal(item.fileName, 'BT-24.60.0-64UWD-Win10-Win11.exe');
  assert.equal(item.sha256, '75E4AB9F4767E4201490C11A0C6F9664D1E50B8046FF8BB498B6538B4C8DDE05');
  assert.deepEqual(item.supportedModels, ['9560', 'AX210']);
  assert.deepEqual(item.driverVersions['9560'], ['24.40.11.1']);
});

test('driver matching does not confuse 9560 with a longer number', () => {
  assert.deepEqual(expectedDriverVersions('Driver version 1.2.3.4 : For 19560', '9560'), []);
});

test('regional agreement includes URL, version, filename, and checksum', () => {
  const left = parseIntelPage(html, route, 'https://www.intel.com/example.html');
  const right = { ...left, pageUrl: 'https://www.intel.co.jp/example.html' };
  assert.equal(packagesAgree(left, right), true);
  assert.equal(packagesAgree(left, { ...right, sha256: '0'.repeat(64) }), false);
});

test('detached manifest signature rejects altered metadata', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const bytes = serializeManifest({ schemaVersion: 1, product: 'intel-wireless-bluetooth' });
  const signature = signManifest(bytes, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  assert.equal(verifyManifest(bytes, signature, publicKey.export({ type: 'spki', format: 'pem' })), true);
  assert.equal(verifyManifest(Buffer.from(`${bytes} `), signature, publicKey.export({ type: 'spki', format: 'pem' })), false);
});
