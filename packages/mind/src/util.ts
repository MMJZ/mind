// export function debounce(
// 	wait: number,
// 	fn: (...args: unknown[]) => void,
// ): (...args: unknown[]) => void {
// 	let timeoutId: number | undefined;

// 	return (...args: unknown[]) => {
// 		window.clearTimeout(timeoutId);
// 		timeoutId = window.setTimeout(() => {
// 			fn(...args);
// 		}, wait);
// 	};
// }

export interface Bounds {
	top: number;
	left: number;
	width: number;
	height: number;
}

export function toPolarCoords(
	x: number,
	y: number,
	bounds: Bounds,
): [number, number] {
	const widthBias = bounds.width / bounds.height;
	const proportX = (2 * (x - bounds.left)) / bounds.width - 1;
	const proportY = (2 * (y - bounds.top)) / bounds.height - 1;
	const r = Math.sqrt(proportX * proportX * widthBias * widthBias + proportY * proportY);
	const θ = Math.atan2(proportX, proportY); // bottom 0, top -π/+π

	return [r, θ];
}

export function toCartesianCoords(r: number, θ: number, bounds: Bounds): [number, number] {
	const widthBias = bounds.width / bounds.height;
	const x = (bounds.width * (Math.sin(θ) * r / widthBias + 1)) / 2;
	const y = (bounds.height * (Math.cos(θ) * r + 1)) / 2;

	return [x, y];
}
