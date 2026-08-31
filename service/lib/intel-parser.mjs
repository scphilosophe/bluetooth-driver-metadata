import { createHash } from 'node:crypto';

const downloadPattern = /data-href\s*=\s*["'](?<url>https:\/\/downloadmirror\.intel\.com\/[^"']+\/(?<file>BT-[^"']+\.exe))["']/giu;
const shaPattern = /SHA256\s*:\s*(?<sha>[A-Fa-f0-9]{64})/iu;

function decodeEntities(value) {
  return value
    .replace(/&nbsp;|&#160;/giu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&lt;/giu, '<')
    .replace(/&gt;/giu, '>')
    .replace(/&#(\d+);/gu, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/giu, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

export function htmlToPlainText(html) {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, ' ')
      .replace(/<[^>]+>/gu, ' ')
  ).replace(/\s+/gu, ' ').trim();
}

function containsModel(text, model) {
  const escaped = model.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`(?<![A-Z0-9])${escaped}(?![A-Z0-9])`, 'iu').test(text);
}

export function expectedDriverVersions(plainText, model, fallback = []) {
  const versions = new Set();
  const escaped = model.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const mapping = /Driver version\s+(?<version>\d+(?:\.\d+){2,3})\s*:\s*For\s+(?<models>.*?)(?=Driver version|The drivers also work|Notes|Which file|How to install|About Intel|$)/giu;
  for (const match of plainText.matchAll(mapping)) {
    if (containsModel(match.groups.models, model)) versions.add(match.groups.version);
  }
  const direct = new RegExp(`Driver version\\s+(?<version>\\d+(?:\\.\\d+){2,3})\\s+for\\s+.{0,180}?(?<![A-Z0-9])${escaped}(?![A-Z0-9])`, 'giu');
  for (const match of plainText.matchAll(direct)) versions.add(match.groups.version);
  for (const version of fallback) versions.add(version);
  return [...versions].sort();
}

export function parseIntelPage(html, route, pageUrl) {
  const matches = [...html.matchAll(downloadPattern)];
  const selected = matches.find((match) => /64UWD/iu.test(match.groups.file));
  if (!selected) throw new Error('Intel page contained no 64-bit Bluetooth installer link.');

  const downloadUrl = decodeEntities(selected.groups.url);
  const uri = new URL(downloadUrl);
  if (uri.protocol !== 'https:' || uri.hostname.toLowerCase() !== 'downloadmirror.intel.com') {
    throw new Error('Intel page returned an unexpected download host.');
  }

  const following = html.slice(selected.index, selected.index + 18000);
  const sha = following.match(shaPattern)?.groups?.sha?.toUpperCase();
  if (!sha) throw new Error('Intel page contained no adjacent SHA-256 value.');

  const fileName = selected.groups.file;
  const packageVersion = /^BT-(?<version>\d+(?:\.\d+){2})-/iu.exec(fileName)?.groups?.version;
  if (!packageVersion) throw new Error('Intel package version could not be parsed from its filename.');

  const plainText = htmlToPlainText(html);
  const supportedModels = route.models.filter((model) => containsModel(plainText, model));
  if (supportedModels.length === 0) throw new Error('Intel page did not list any expected models for this route.');

  const driverVersions = {};
  for (const model of supportedModels) {
    const versions = expectedDriverVersions(plainText, model, route.fallbackDriverVersions[model] ?? []);
    if (versions.length > 0) driverVersions[model] = versions;
  }

  return {
    route: route.key,
    name: route.name,
    pageUrl,
    packageVersion,
    fileName,
    downloadUrl,
    sha256: sha,
    sizeBytes: 0,
    supportedModels,
    driverVersions,
    endOfLife: route.endOfLife
  };
}

export function packagesAgree(left, right) {
  return left.route === right.route &&
    left.packageVersion === right.packageVersion &&
    left.fileName === right.fileName &&
    left.downloadUrl === right.downloadUrl &&
    left.sha256 === right.sha256;
}

export async function sha256OfResponse(response) {
  if (!response.ok || !response.body) throw new Error(`Installer request failed with HTTP ${response.status}.`);
  const hash = createHash('sha256');
  for await (const chunk of response.body) hash.update(chunk);
  return hash.digest('hex').toUpperCase();
}
