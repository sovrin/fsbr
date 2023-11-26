/**
 *
 * @param text
 * @param pattern
 */
export const matches = (text: string, pattern: RegExp) => ({
    [Symbol.iterator]: function* () {
        const clone = new RegExp(pattern.source, pattern.flags);
        let match = null;
        do {
            match = clone.exec(text);
            if (match) {
                yield match;
            }
        } while (match);
    },
});

/**
 *
 * @param a
 * @param b
 */
export const arrayEqual = <T> (a: Array<T>, b: Array<T>): boolean => (
    a.every((element, index) => element === b[index])
);

