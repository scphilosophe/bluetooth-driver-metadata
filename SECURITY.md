# Security

Everything served by this repository is public and should be treated as
untrusted until its detached signature is verified with
`config/metadata-public.pem`.

The private signing key is not part of this repository. The refresh workflow
receives it through the encrypted `METADATA_SIGNING_KEY` Actions secret. A new
key pair requires a new Windows application build containing the corresponding
public key.

The metadata never authorizes arbitrary executable hosts. The Windows client
accepts only the expected path on `https://downloadmirror.intel.com`, a matching
SHA-256 digest, and an Intel Corporation code-signing certificate accepted by
Windows `WinVerifyTrust`.

