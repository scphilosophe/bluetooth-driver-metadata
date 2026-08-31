# Signed Intel Bluetooth metadata

This public repository supplies a small, static metadata layer for Steven's
Bluetooth Driver Updater. The Windows application source remains in a separate
private repository.

## Public records

- `service/public/intel-bluetooth.json` describes the currently verified Intel
  Bluetooth installer routes.
- `service/public/intel-bluetooth.json.sig` is its detached RSA-SHA256
  signature.
- `config/metadata-public.pem` is the public key embedded in the Windows
  application.

The application reads these files from `raw.githubusercontent.com`, verifies
the detached signature locally, and then independently verifies the downloaded
installer's SHA-256 hash and Windows-trusted Intel Authenticode signature. A
hosting or repository change cannot create an accepted record without the
private signing key.

## Refresh job

The scheduled workflow checks Intel's US and Japanese regional pages. A newly
discovered installer is downloaded and hashed in full before publication. If
the regions disagree, the current route cannot be freshly observed, or the
installer hash differs from Intel's published value, the job stops without
replacing the last signed record.

The private signing key must exist only as the encrypted GitHub Actions secret
`METADATA_SIGNING_KEY`. It is never committed to this repository.
