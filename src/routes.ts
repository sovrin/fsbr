import cacheFactory from './cache';
import {Listener, Method, Middleware, Parameters, Path, Routes, Token} from './types';

const VARIABLE = ':';
const PATH = '/';
const WILDCARD = '*';

export const LISTENER = Symbol.for('listener');

enum Type {
    MIDDLEWARE = '#',
    LISTENER = '$'
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
    const tokenize = (type: Type, method: Method, path: Path): Token[] => (
        [type, method, path].filter(Boolean)
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
     * @param listener
     * @param routes
     */
    const up = (tokens: Token[], listener: Listener | Middleware, routes: Routes) => {
        const token = tokens.shift();

        if (!token) {
            return true;
        }

        if (!routes[token]) {
            routes[token] = {};
        }

        if (tokens.length === 0) {
            routes[token][LISTENER] = listener;
        }

        return up(tokens, listener, routes[token]);
    };

    /**
     *
     * @param tokens
     * @param routes
     */
    const down = (tokens: Token[], routes: Routes): Listener | Middleware => {
        let token = tokens.shift();

        if (!token) {
            return routes[LISTENER];
        } else if (routes[WILDCARD]) {
            if (routes[WILDCARD][LISTENER]) {
                return routes[WILDCARD][LISTENER];
            }

            return down(tokens, routes[WILDCARD]);
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
     * @param listener
     */
    const set = (method: Method, path: Path, listener: Listener | Middleware) => {
        const type = !method && Type.MIDDLEWARE || Type.LISTENER;
        const tokens = tokenize(type, method, path);

        cache.del(tokens);

        up(tokens, listener, routes);
    };

    /**
     *
     * @param path
     */
    const reduce = (path: Path): Middleware[] => {
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
        const reducer = (acc: Partial<Middleware>[], token: Token, i: number, tokens: Token[]) => {
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
    const resolve = (method: Method, path: Path): Parameters => {
        const tokens = tokenize(Type.LISTENER, method, path);

        const context = {} as Parameters;
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
    };

    /**
     *
     * @param method
     * @param path
     */
    const get = (method: Method, path: Path): Listener | Middleware => {
        const type = !method && Type.MIDDLEWARE || Type.LISTENER;
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
