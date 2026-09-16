/** @format */

'use client';

import { useEffect, useSyncExternalStore } from 'react';

type Listener = () => void;

let hidden = false;
let depth = 0;
const listeners = new Set<Listener>();

function emit() {
	listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function getSnapshot() {
	return hidden;
}

/** Usado pelo AppSidebar para saber se deve ou não se renderizar. */
export function useAppSidebarHidden() {
	return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Chamado por telas em tela cheia (ex.: wizard de abertura de chamado) para ocultar a sidebar enquanto estiverem ativas. */
export function useHideAppSidebar(hide: boolean) {
	useEffect(() => {
		if (!hide) return;

		depth += 1;
		if (depth === 1) {
			hidden = true;
			emit();
		}

		return () => {
			depth -= 1;
			if (depth === 0) {
				hidden = false;
				emit();
			}
		};
	}, [hide]);
}
