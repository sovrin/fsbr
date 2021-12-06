import {Cache, Middleware, Token} from './types';

/**
 *
 */
const factory = () => {
    const cache: Map<string, any> = new Map();

    /**
     *
     */
    const serialize = (tokens: Token[]): string => (
        tokens.join('|')
    );

    /**
     *
     * @param tokens
     */
    const has = (tokens: Token[]): boolean => {
        const key = serialize(tokens);

        return cache.has(key);
    };

    /**
     *
     * @param tokens
     */
    const get = (tokens: Token[]): Middleware[] => {
        const key = serialize(tokens);

        return cache.get(key);
    };

    /**
     *
     * @param tokens
     * @param value
     */
    const set = (tokens: Token[], value: Middleware[]): Cache => {
        const key = serialize(tokens);
        cache.set(key, value);

        return context();
    };

    /**
     *
     * @param tokens
     */
    const del = (tokens: Token[]): boolean => {
        const key = serialize(tokens);

        return cache.delete(key);
    };

    /**
     *
     */
    const context = (): Cache => ({
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
