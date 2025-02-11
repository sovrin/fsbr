import cacheClosure from './cache';

import {arrayEqual, matches} from './utils';
import {HANDLERS, MIDDLEWARES, RESOLVER} from './const';
import type {Handler, Method, Middleware, Parameters, Path, Position, Routes, Token} from './types';

const VARIABLE = /:([a-zA-Z0-9]+)|\[([a-zA-Z0-9]+)]/g;
const PATH = '/';
const WILDCARD = '*';

const TOKEN_DYNAMIC = 'dynamic';
const TOKEN_STATIC = 'static';

enum Type {
    MIDDLEWARE = '/Middleware/',
    HANDLER = '/Handler/',
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
        const results = [];
        for (const match of matches(route, VARIABLE)) {
            results.push(match[1] || match[2]);
        }

        return results;
    };

    const insert = (type: Type, tokens: Token[], target, position: Position, context: Routes): boolean => {
        const token = tokens.shift();
        if (!token) {
            return true;
        }

        if (!context[token]) {
            context[token] = {
                [HANDLERS]: [],
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
            if (type === Type.HANDLER) {
                context[token][HANDLERS] = [target, position];
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
            case Type.HANDLER:
                return context[HANDLERS] as T;
            case Type.MIDDLEWARE:
                return context[MIDDLEWARES] as T;
            case Type.RESOLVER:
                return context[RESOLVER] as T;
            }
        }

        const wildcardContext = context[WILDCARD];
        if (wildcardContext) {
            switch (type) {
            case Type.HANDLER:
                if (wildcardContext[HANDLERS].length) {
                    return wildcardContext[HANDLERS] as T;
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
                case Type.HANDLER:
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

        const uniqueMiddlewares = new Set<Middleware>();
        const tokensLength = tokens.length;

        for (let i = 0; i < tokensLength; i++) {
            const partial = tokens.slice(0, i + 1);
            const middlewares = eject<Array<[Middleware, Position]>>(Type.MIDDLEWARE, partial, routes);

            for (const [fn, current] of middlewares) {
                if (fn && (position == null || current < position)) {
                    uniqueMiddlewares.add(fn);
                }
            }
        }

        const result = Array.from(uniqueMiddlewares);
        cache.set(tokens, [result, position]);

        return result;
    };

    const resolve = (method: Method, path: Path): Parameters => {
        const tokens = tokenize(Type.HANDLER, method, path);
        const context = {} as Parameters;
        let cursor = routes;

        for (let level = 0; level < tokens.length && cursor; level++) {
            const step = tokens[level];
            if (cursor[step]) {
                cursor = cursor[step];
                continue;
            }

            const resolver = eject<Routes[typeof RESOLVER]>(Type.RESOLVER, [step], cursor);
            if (!resolver) {
                cursor = cursor[step];
                continue;
            }

            if (resolver.type === TOKEN_DYNAMIC) {
                const values = step.split('.');
                resolver.variables.forEach((variable, i) => {
                    context[variable] = values[i];
                });
            }

            cursor = cursor[resolver.key];
        }

        return context;
    };

    const set = (method: Method, path: Path, subject: Handler | Middleware) => {
        const type = (!method)
            ? Type.MIDDLEWARE
            : Type.HANDLER;

        const tokens = tokenize(type, method, path);
        cache.del(tokens);

        ++position;

        insert(type, tokens, subject, position, routes);
    };

    const get = (method: Method, path: Path): [Handler, Position] => {
        const token = tokenize(Type.HANDLER, method, path);

        return eject<[Handler, Position]>(Type.HANDLER, token, routes);
    };

    const has = (method: Method, path: Path): boolean => {
        const token = tokenize(Type.HANDLER, method, path);
        const hit = token.reduce((routes, token) => routes[token], routes);
        if (!hit) {
            return false;
        }

        return hit[HANDLERS] != null;
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
