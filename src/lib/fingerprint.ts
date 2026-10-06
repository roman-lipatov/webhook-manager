const STORAGE_KEY = "device_fingerprint";

export function getFingerprint(): string {
  const existing = localStorage.getItem(STORAGE_KEY);

  if (existing !== null) {
    return existing;
  }

  const fingerprint = crypto.randomUUID().replace(/-/g, '');
  localStorage.setItem(STORAGE_KEY, fingerprint);

  return fingerprint;
}
