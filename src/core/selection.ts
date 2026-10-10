let _pendingSoundId: string | null = null;

export function setPendingSound(id: string) {
  _pendingSoundId = id;
}

export function takePendingSound(): string | null {
  const id = _pendingSoundId;
  _pendingSoundId = null;
  return id;
}
