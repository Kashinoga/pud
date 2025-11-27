// src/lib/stores/currency.ts
import { writable } from 'svelte/store';

export const clicks = writable(0);
export const cps = writable(0); // clicks per second from upgrades
export const total = writable(0);

let last = performance.now();

const step = () => {
	const now = performance.now();
	const dt = (now - last) / 1000;

	last = now;

	let currentTotal: number = 0;
	let currentCps: number = 0;

	total.update((v) => ((currentTotal = v), v));
	cps.update((v) => ((currentCps = v), v));

	total.set((currentTotal ?? 0) + (currentCps ?? 0) * dt);

	requestAnimationFrame(step);
};

requestAnimationFrame(step);
