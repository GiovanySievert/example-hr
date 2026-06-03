export enum WriteBehavior {
  Success = 'success',
  Conflict = 'conflict',
  InsufficientBalance = 'insufficient-balance',
  SilentWrong = 'silent-wrong',
}

export enum WriteResultKind {
  Success = 'success',
  SilentWrong = 'silent-wrong',
  Conflict = 'conflict',
  InsufficientBalance = 'insufficient-balance',
  NotFound = 'not-found',
  InvalidRequest = 'invalid-request',
}

export enum DecisionResultKind {
  Success = 'success',
  NotFound = 'not-found',
  Conflict = 'conflict',
}
