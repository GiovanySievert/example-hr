export enum WriteBehavior {
  Success = 'success',
  Conflict = 'conflict',
  InsufficientBalance = 'insufficient-balance',
  SilentWrong = 'silent-wrong',
  SilentWrongPendingMismatch = 'silent-wrong-pending-mismatch',
}

export enum WriteResultKind {
  Success = 'success',
  SilentWrong = 'silent-wrong',
  Conflict = 'conflict',
  InsufficientBalance = 'insufficient-balance',
  OverlappingRequest = 'overlapping-request',
  PolicyViolation = 'policy-violation',
  NotFound = 'not-found',
  InvalidRequest = 'invalid-request',
}

export enum DecisionResultKind {
  Success = 'success',
  NotFound = 'not-found',
  Conflict = 'conflict',
}
