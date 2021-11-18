import {Cache} from './types';

/**
 *
 */
const factory = () => {
    const cache: Map<string, any> = new Map();

    /**
     *
     */
    const serialize = (tokens: Array<string>): string => (
        tokens.join('|')
    );

    /**
     *
     */
    const context = (): Cache => ({
        has,
        get,
        set,
        del,
    });

    /**
     *
     * @param tokens
     */
    const has = (tokens: Array<string>): boolean => {
        const key = serialize(tokens);

        return cache.has(key);
    };

    /**
     *
     * @param tokens
     */
    const get = (tokens: Array<string>): any => {
        const key = serialize(tokens);

        return cache.get(key);
    };

    /**
     *
     * @param tokens
     * @param value
     */
    const set = (tokens: Array<string>, value: any): Cache => {
        const key = serialize(tokens);
        cache.set(key, value);

        return context();
    };

    /**
     *
     * @param tokens
     */
    const del = (tokens: Array<string>): boolean => {
        const key = serialize(tokens);

        return cache.delete(key);
    };

    return context();
};

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 23.12.2020
 * Time: 17:59
 */
export default factory;
