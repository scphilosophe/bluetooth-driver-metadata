import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { routes } from '../lib/routes.mjs';
import { packagesAgree, parseIntelPage, sha256OfResponse } from '../lib/intel-parser.mjs';
import { serializeManifest, signManifest, verifyManifest } from '../lib/signing.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const serviceRoot = path.resolve(here, '..');
const outputDirectory = path.join(serviceRoot, 'public');
const manifestPath = path.join(outputDirectory, 'intel-bluetooth.json');
const signaturePath = `${manifestPath}.sig`;
const publicKeyPath = path.resolve(serviceRoot, '..', 'config', 'metadata-public.pem');
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

function timeoutSignal(milliseconds) {
  return AbortSignal.timeout(milliseconds);
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: timeoutSignal(60_000),
    headers: {
      'user-agent': userAgent,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-AU,en;q=0.9'
    }
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  const requested = new URL(url);
  const final = new URL(response.url);
  if (final.protocol !== 'https:' || final.hostname.toLowerCase() !== requested.hostname.toLowerCase()) {
    throw new Error(`${url} redirected to an unexpected host.`);
  }
  const text = await response.text();
  if (text.length < 500) throw new Error(`${url} returned an unexpectedly short page.`);
  return text;
}

async function exactSize(downloadUrl) {
  try {
    const response = await fetch(downloadUrl, {
      method: 'HEAD', redirect: 'follow', signal: timeoutSignal(45_000), headers: { 'user-agent': userAgent }
    });
    if (!response.ok) return 0;
    validateInstallerResponse(response, downloadUrl);
    const value = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function validateInstallerResponse(response, expectedUrl) {
  const expected = new URL(expectedUrl);
  const final = new URL(response.url);
  if (final.protocol !== 'https:' || final.hostname.toLowerCase() !== 'downloadmirror.intel.com' ||
      decodeURIComponent(final.pathname) !== decodeURIComponent(expected.pathname)) {
    throw new Error('Intel installer request redirected to an unexpected address.');
  }
}

function previousEndOfLifePackage(route, previousManifest) {
  if (!route.endOfLife) return null;
  const previous = previousManifest?.packages?.find((item) => item.route === route.key);
  if (!previous?.installerHashVerifiedAt || previous.endOfLife !== true) return null;
  const page = new URL(previous.pageUrl);
  const download = new URL(previous.downloadUrl);
  if (!route.urls.includes(previous.pageUrl) || page.protocol !== 'https:' ||
      !['www.intel.com', 'www.intel.co.jp'].includes(page.hostname.toLowerCase()) ||
      download.protocol !== 'https:' || download.hostname.toLowerCase() !== 'downloadmirror.intel.com' ||
      !/^BT-[A-Za-z0-9._-]+\.exe$/iu.test(previous.fileName) ||
      !/^[A-Fa-f0-9]{64}$/u.test(previous.sha256) ||
      decodeURIComponent(download.pathname).split('/').at(-1) !== previous.fileName) return null;
  return previous;
}

async function readPreviousManifest() {
  let bytes;
  try {
    bytes = await readFile(manifestPath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  const [signature, publicKey] = await Promise.all([
    readFile(signaturePath, 'utf8'),
    readFile(publicKeyPath, 'utf8')
  ]);
  if (!verifyManifest(bytes, signature, publicKey)) {
    throw new Error('The previously published manifest has an invalid signature; publication stopped.');
  }
  return JSON.parse(bytes.toString('utf8'));
}

async function collectRoute(route, previousManifest) {
  const successes = [];
  const failures = [];
  for (const url of route.urls) {
    try {
      successes.push(parseIntelPage(await fetchText(url), route, url));
    } catch (error) {
      failures.push(`${url}: ${error.message}`);
    }
  }
  if (successes.length === 0) {
    const carried = previousEndOfLifePackage(route, previousManifest);
    if (carried) {
      process.stdout.write(`Intel's retired pages were unavailable for ${route.key}; retaining the previously hash-verified final package.\n`);
      return carried;
    }
    throw new Error(`Every Intel source failed for ${route.key}. ${failures.join(' ')}`);
  }
  if (successes.some((item) => !packagesAgree(successes[0], item))) {
    throw new Error(`Intel regional sources disagree for ${route.key}; publication stopped.`);
  }

  const result = successes[0];
  result.sourceUrls = successes.map((item) => item.pageUrl);
  result.sizeBytes = await exactSize(result.downloadUrl);

  const previous = previousManifest?.packages?.find((item) =>
    item.route === result.route && item.downloadUrl === result.downloadUrl && item.sha256 === result.sha256
  );
  if (previous?.installerHashVerifiedAt) {
    result.installerHashVerifiedAt = previous.installerHashVerifiedAt;
  } else {
    const response = await fetch(result.downloadUrl, {
      redirect: 'follow', signal: timeoutSignal(15 * 60_000), headers: { 'user-agent': userAgent }
    });
    validateInstallerResponse(response, result.downloadUrl);
    const actualHash = await sha256OfResponse(response);
    if (actualHash !== result.sha256) throw new Error(`Intel installer hash mismatch for ${result.fileName}.`);
    result.installerHashVerifiedAt = new Date().toISOString();
  }
  return result;
}

async function main() {
  const privateKey = process.env.METADATA_SIGNING_KEY;
  if (!privateKey) throw new Error('METADATA_SIGNING_KEY is required.');

  const previousManifest = await readPreviousManifest();
  const packages = [];
  for (const route of routes) packages.push(await collectRoute(route, previousManifest));

  const generated = new Date();
  const expires = new Date(generated.getTime() + 8 * 24 * 60 * 60 * 1000);
  const manifest = {
    schemaVersion: 1,
    product: 'intel-wireless-bluetooth',
    generatedAt: generated.toISOString(),
    expiresAt: expires.toISOString(),
    packages
  };
  const bytes = serializeManifest(manifest);
  const signature = signManifest(bytes, privateKey);
  const publicKey = await readFile(publicKeyPath, 'utf8');
  if (!verifyManifest(bytes, signature, publicKey)) {
    throw new Error('METADATA_SIGNING_KEY does not match the public key distributed with the application.');
  }
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(manifestPath, bytes);
  await writeFile(signaturePath, `${signature}\n`, 'utf8');
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
