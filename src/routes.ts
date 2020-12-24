import cacheFactory from './cache';
import {Handler, Method, Middleware, Path, Routes, Tokens} from "./types";

const VARIABLE = ':';
const PATH = '/';
const WILDCARD = '*';

export const HANDLER = Symbol.for('handler');

enum Type {
    MIDDLEWARE = '#',
    HANDLER = '$'
}

/**
 *
 */
const factory = () => {
    const routes: Routes = {};
    const cache = cacheFactory();

    /**
     *
     * @param type
     * @param method
     * @param path
     */
    const tokenize = (type: Type, method: Method, path: Path): Tokens => (
        [type, method, path].filter(Boolean)
            // .map(entry => entry.toUpperCase())
            .join(PATH)
            .split(PATH)
            .filter(Boolean)
    );

    /**
     *
     * @param routes
     */
    const keys = (routes: Routes) => (
        Object.keys(routes)
    );

    /**
     *
     * @param tokens
     * @param handler
     * @param routes
     */
    const up = (tokens: Tokens, handler: Handler | Middleware, routes: Routes) => {
        const token = tokens.shift();

        if (!token) {
            return true;
        }

        if (!routes[token]) {
            routes[token] = {};
        }

        if (tokens.length === 0) {
            routes[token][HANDLER] = handler;
        }

        return up(tokens, handler, routes[token]);
    };

    /**
     *
     * @param tokens
     * @param routes
     */
    const down = (tokens: Tokens, routes: Routes): Handler | Middleware => {
        let token = tokens.shift();

        if (!token) {
            return routes[HANDLER];
        } else if (routes[WILDCARD]) {
            return routes[WILDCARD][HANDLER];
        } else if (!routes[token]) {
            token = keys(routes)
                .find((route) => route[0] === VARIABLE)
            ;

            if (!token) {
                return null;
            }
        }

        return down(tokens, routes[token]);
    };

    /**
     *
     * @param method
     * @param path
     * @param handler
     */
    const set = (method: Method, path: Path, handler: Handler | Middleware) => {
        const type = !method && Type.MIDDLEWARE || Type.HANDLER;
        const tokens = tokenize(type, method, path);

        cache.del(tokens);

        up(tokens, handler, routes);
    };

    /**
     *
     * @param path
     */
    const reduce = (path: Path): Array<any> => {
        const tokens = tokenize(Type.MIDDLEWARE, null, path);

        if (cache.has(tokens)) {
            return cache.get(tokens);
        }

        /**
         *
         * @param acc
         * @param token
         * @param i
         * @param tokens
         */
        const reducer = (acc, token, i, tokens) => {
            const partial = tokens.slice(0, i + 1);
            const fn = down(partial, routes);

            if (!fn) {
                return acc;
            }

            acc.push(fn);

            return [].concat(...acc);
        };

        const reduced = tokens.reduce(reducer, []);

        cache.set(tokens, reduced);

        return reduced;
    };

    /**
     *
     * @param method
     * @param path
     */
    const resolve = (method: Method, path: Path) => {
        const tokens = tokenize(Type.HANDLER, method, path);

        const context = {};
        let level = 0;
        let cursor = routes;

        while (cursor && level < tokens.length) {
            const current = tokens[level];
            const route = keys(cursor)
                .find((item) => item === current || item[0] === VARIABLE)
            ;

            if (route && route[0] === VARIABLE) {
                const key = route.slice(1)
                    .toLowerCase()
                ;

                context[key] = tokens[level];
            }

            cursor = cursor[route];
            level++;
        }

        return context;
    }

    /**
     *
     * @param method
     * @param path
     */
    const get = (method: Method, path: Path): Handler | Middleware => {
        const type = !method && Type.MIDDLEWARE || Type.HANDLER;
        const token = tokenize(type, method, path);

        return down(token, routes);
    };

    return {
        set,
        reduce,
        resolve,
        get,
    };
};

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 20.12.2020
 * Time: 23:15
 */
export default factory;