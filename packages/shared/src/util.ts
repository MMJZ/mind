export function tuple<A, B>(a: A, b: B): [A, B] {
	return [a, b];
}

type AllKeys<T> = T extends object ? keyof T : never;

type PickType<T, K extends keyof T> = T extends { [k in K]?: object }
	? T[K]
	: undefined;

type PickTypeOf<T, K extends string | number | symbol> = K extends AllKeys<T>
	? PickType<T, K>
	: never;

export type Merge<T extends object> = {
	[k in AllKeys<T>]: PickTypeOf<T, k>;
};
