import type {Cache, Token} from './types';

const factory = <T> (length = 1000) => {
    const cache: Map<string, T> = new Map();

    const serialize = (tokens: Token[]): string => (
        tokens.join('|')
    );

    const has = (tokens: Token[]): boolean => {
        const key = serialize(tokens);

        return cache.has(key);
    };

    const get = (tokens: Token[]): T => {
        const key = serialize(tokens);

        return cache.get(key);
    };

    const set = (tokens: Token[], value: T): Cache<T> => {
        const key = serialize(tokens);

        if (cache.size >= length) {
            cache.delete(cache.keys().next().value);
        }

        cache.set(key, value);

        return context();
    };

    const del = (tokens: Token[]): boolean => {
        const key = serialize(tokens);

        return cache.delete(key);
    };

    const context = (): Cache<T> => ({
        has,
        get,
        set,
        del,
    });

    return context();
};

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 23.12.2020
 * Time: 17:59
 */
export default factory;
