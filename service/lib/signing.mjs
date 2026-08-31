import { createSign, createVerify } from 'node:crypto';

export function serializeManifest(manifest) {
  return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

export function signManifest(bytes, privateKeyPem) {
  const signer = createSign('RSA-SHA256');
  signer.update(bytes);
  signer.end();
  return signer.sign(privateKeyPem).toString('base64');
}

export function verifyManifest(bytes, signatureBase64, publicKeyPem) {
  const verifier = createVerify('RSA-SHA256');
  verifier.update(bytes);
  verifier.end();
  return verifier.verify(publicKeyPem, Buffer.from(signatureBase64.trim(), 'base64'));
}
