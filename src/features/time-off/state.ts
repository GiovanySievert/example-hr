import { atom } from 'jotai';

import { cellKey } from './api/cell-key';
import type { BalanceCell } from './api/types';

export const inFlightCellsAtom = atom<Set<string>>(new Set<string>());

export const isCellInFlightAtom = atom((get) => {
  const cells = get(inFlightCellsAtom);
  return (cell: BalanceCell) => cells.has(cellKey(cell));
});

export const markCellInFlightAtom = atom(null, (get, set, cell: BalanceCell) => {
  const next = new Set(get(inFlightCellsAtom));
  next.add(cellKey(cell));
  set(inFlightCellsAtom, next);
});

export const clearCellInFlightAtom = atom(null, (get, set, cell: BalanceCell) => {
  const next = new Set(get(inFlightCellsAtom));
  next.delete(cellKey(cell));
  set(inFlightCellsAtom, next);
});

export const refreshedCellsAtom = atom<Set<string>>(new Set<string>());

export const markCellRefreshedAtom = atom(null, (get, set, cell: BalanceCell) => {
  const next = new Set(get(refreshedCellsAtom));
  next.add(cellKey(cell));
  set(refreshedCellsAtom, next);
});

export const acknowledgeCellRefreshedAtom = atom(null, (get, set, cell: BalanceCell) => {
  const next = new Set(get(refreshedCellsAtom));
  next.delete(cellKey(cell));
  set(refreshedCellsAtom, next);
});
