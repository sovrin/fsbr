import cacheClosure from './cache';

import {arrayEqual, matches} from './utils';
import {LISTENERS, MIDDLEWARES, RESOLVER} from './const';
import type {Listener, Method, Middleware, Parameters, Path, Position, Routes, Token} from './types';

const VARIABLE = /:([a-zA-Z0-9]+)|\[([a-zA-Z0-9]+)]/g;
const PATH = '/';
const WILDCARD = '*';

const TOKEN_DYNAMIC = 'dynamic';
const TOKEN_STATIC = 'static';

enum Type {
    MIDDLEWARE = '/Middleware/',
    LISTENER = '/Listener/',
    RESOLVER = '/Resolver/',
}

const closure = () => {
    const routes: Routes = {};
    const cache = cacheClosure<[Middleware[], Position]>();
    let position: Position = 0 as Position;

    const tokenize = (type: Type, method: Method, path: Path): Token[] => {
        const tokens = [method, path]
            .filter(Boolean)
            .join(PATH)
            .split(PATH)
            .filter(Boolean);

        return [type, ...tokens] as Token[];
    };

    const find = (routes: Routes, needle: string): Token => {
        const tokens = Object.keys(routes)
            .filter((key) => key.match(VARIABLE))
            .filter((key) => key.split('.').length === needle.split('.').length)
            .sort((a, b) => a.match(VARIABLE).length - b.match(VARIABLE).length);

        for (const token of tokens) {
            const needleParts = needle.split('.');
            const tokenParts = token.split('.');
            const {length} = needleParts;

            let level = 0;
            while (level < length) {
                needleParts.shift();
                const partial = tokenParts.shift();

                const isEqual = arrayEqual(needleParts, tokenParts);
                if (isEqual && partial.match(VARIABLE)) {
                    return token as Token;
                }

                level++;
            }
        }
    };

    const parse = (route: string): string[] => {
        return Array.from(matches(route, VARIABLE))
            .map((matches) => matches.filter(Boolean))
            .map(([, match]) => match);
    };

    const insert = (type: Type, tokens: Token[], target, position: Position, context: Routes): boolean => {
        const token = tokens.shift();
        if (!token) {
            return true;
        }

        if (!context[token]) {
            context[token] = {
                [LISTENERS]: [],
                [MIDDLEWARES]: [],
                [RESOLVER]: {
                    type: token.match(VARIABLE)
                        ? TOKEN_DYNAMIC
                        : TOKEN_STATIC,
                    key: token,
                    variables: parse(token),
                },
            };
        }

        if (tokens.length === 0) {
            if (type === Type.LISTENER) {
                context[token][LISTENERS] = [target, position];
            } else {
                if (!Array.isArray(target)) {
                    target = [target];
                }

                for (const fn of target) {
                    context[token][MIDDLEWARES].push([fn, position]);
                }
            }
        }

        return insert(type, tokens, target, position, context[token]);
    };

    const eject = <T> (type: Type, tokens: Token[], context: Routes, level = 2): T => {
        let token = tokens.shift();
        if (!token) {
            if (level === 0 && context[WILDCARD]) {
                return eject<T>(type, tokens, context[WILDCARD], --level);
            }

            switch (type) {
            case Type.LISTENER:
                return context[LISTENERS] as T;
            case Type.MIDDLEWARE:
                return context[MIDDLEWARES] as T;
            case Type.RESOLVER:
                return context[RESOLVER] as T;
            }
        }

        const wildcardContext = context[WILDCARD];
        if (wildcardContext) {
            switch (type) {
            case Type.LISTENER:
                if (wildcardContext[LISTENERS].length) {
                    return wildcardContext[LISTENERS] as T;
                }

                break;
            case Type.RESOLVER:
                return wildcardContext[RESOLVER] as T;
            }

            return eject<T>(type, tokens, wildcardContext, --level);
        }

        if (!context[token]) {
            token = find(context, token);
            if (!token) {
                switch (type) {
                case Type.MIDDLEWARE:
                case Type.LISTENER:
                    return [] as T;
                default:
                    return null;
                }
            }
        }

        return eject<T>(type, tokens, context[token], --level);
    };

    const reduce = (path: Path, position?: Position): Middleware[] => {
        const tokens = tokenize(Type.MIDDLEWARE, null, path);
        if (cache.has(tokens)) {
            const [middlewares, current] = cache.get(tokens);
            if (position == null || current < position) {
                return middlewares;
            }
        }

        const reducer = (acc: Middleware[], _token: Token, i: number, tokens: Token[]): Middleware[] => {
            const partial = tokens.slice(0, i + 1);
            const middlewares = eject<Array<[Middleware, Position]>>(Type.MIDDLEWARE, partial, routes)
                .filter(Boolean)
                .filter(([, current]) => position == null || current < position)
                .map(([fn]) => fn);

            return [
                ...acc,
                ...middlewares,
            ];
        };

        const reduced = tokens.reduce(reducer, []);
        cache.set(tokens, [
            reduced,
            position,
        ]);

        return reduced;
    };

    const resolve = (method: Method, path: Path): Parameters => {
        const tokens = tokenize(Type.LISTENER, method, path);
        const context = {} as Parameters;
        let level = 0;
        let cursor = routes;

        const next = (token: Token): void => {
            cursor = cursor[token];
            ++level;
        };

        while (cursor && level < tokens.length) {
            const step = tokens[level];
            if (cursor[step]) {
                next(step);
                continue;
            }

            const resolver = eject<Routes[typeof RESOLVER]>(Type.RESOLVER, [step], cursor);
            if (!resolver) {
                next(step);
                continue;
            }

            const {variables, key, type} = resolver;
            if (type !== TOKEN_DYNAMIC) {
                next(key);
            }

            const values = step.split('.');
            variables.forEach((variable, i) => {
                context[variable] = values[i];
            });

            next(key);
        }

        return context;
    };

    const set = (method: Method, path: Path, listener: Listener | Middleware) => {
        const type = (!method)
            ? Type.MIDDLEWARE
            : Type.LISTENER;

        const tokens = tokenize(type, method, path);
        cache.del(tokens);

        ++position;

        insert(type, tokens, listener, position, routes);
    };

    const get = (method: Method, path: Path): [Listener, Position] => {
        const token = tokenize(Type.LISTENER, method, path);

        return eject<[Listener, Position]>(Type.LISTENER, token, routes);
    };

    const has = (method: Method, path: Path): boolean => {
        const token = tokenize(Type.LISTENER, method, path);
        const hit = token.reduce((routes, token) => routes[token], routes);
        if (!hit) {
            return false;
        }

        return hit[LISTENERS] != null;
    };

    return {
        reduce,
        resolve,
        set,
        get,
        has,
    };
};

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 20.12.2020
 * Time: 23:15
 */
export default closure;
