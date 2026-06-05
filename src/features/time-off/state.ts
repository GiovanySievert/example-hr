import { atom } from 'jotai';

import { cellKey } from './api/cell-key';
import type { BalanceCell, TimeOffRequest } from './api/types';

export type RevertedTimeOffRequest = TimeOffRequest & {
  reverted: true;
};

function createCellSetAtoms() {
  const setAtom = atom<Set<string>>(new Set<string>());

  const hasAtom = atom((get) => {
    const cells = get(setAtom);
    return (cell: BalanceCell) => cells.has(cellKey(cell));
  });

  const addAtom = atom(null, (get, set, cell: BalanceCell) => {
    const next = new Set(get(setAtom));
    next.add(cellKey(cell));
    set(setAtom, next);
  });

  const removeAtom = atom(null, (get, set, cell: BalanceCell) => {
    const next = new Set(get(setAtom));
    next.delete(cellKey(cell));
    set(setAtom, next);
  });

  return { setAtom, hasAtom, addAtom, removeAtom };
}

const inFlight = createCellSetAtoms();
export const inFlightCellsAtom = inFlight.setAtom;
export const isCellInFlightAtom = inFlight.hasAtom;
export const markCellInFlightAtom = inFlight.addAtom;
export const clearCellInFlightAtom = inFlight.removeAtom;

const refreshed = createCellSetAtoms();
export const refreshedCellsAtom = refreshed.setAtom;
export const markCellRefreshedAtom = refreshed.addAtom;
export const acknowledgeCellRefreshedAtom = refreshed.removeAtom;

export const rolledBackRequestsAtom = atom<RevertedTimeOffRequest[]>([]);

export const addRolledBackRequestAtom = atom(null, (get, set, request: RevertedTimeOffRequest) => {
  set(rolledBackRequestsAtom, [request, ...get(rolledBackRequestsAtom)]);
});
