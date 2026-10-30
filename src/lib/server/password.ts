// PBKDF2 ผ่าน Web Crypto: ใช้ได้ทั้ง Node และ Cloudflare Workers โดยไม่ต้องมี native module
const ITERATIONS = 100_000;
const enc = new TextEncoder();

const toHex = (buf: ArrayBuffer | Uint8Array) =>
	Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf), (b) =>
		b.toString(16).padStart(2, '0')
	).join('');

const fromHex = (hex: string) => new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));

async function derive(password: string, salt: Uint8Array, iterations: number) {
	const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
		'deriveBits'
	]);
	return crypto.subtle.deriveBits(
		{ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
		key,
		256
	);
}

export async function hashPassword(password: string) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const hash = await derive(password, salt, ITERATIONS);
	return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

export async function verifyPassword(password: string, stored: string) {
	const [scheme, iter, salt, hash] = stored.split('$');
	if (scheme !== 'pbkdf2' || !salt || !hash) return false;
	const actual = toHex(await derive(password, fromHex(salt), Number(iter)));
	if (actual.length !== hash.length) return false;
	let diff = 0;
	for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ hash.charCodeAt(i);
	return diff === 0;
}

export async function sha256Hex(value: string) {
	return toHex(await crypto.subtle.digest('SHA-256', enc.encode(value)));
}

export function randomToken() {
	return toHex(crypto.getRandomValues(new Uint8Array(32)));
}
