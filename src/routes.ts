import creator from './creator';
import type {
    Listener,
    Method,
    Middleware,
    Parameters,
    Path,
    Position,
    Routes,
    Token,
} from './types';

const VARIABLE = /^(:.*)|(\[.*\])$/;
const PATH = '/';
const WILDCARD = '*';

export const LISTENER = Symbol.for('listener');
export const MIDDLEWARES = Symbol.for('middlewares');

enum Type {
    MIDDLEWARE = 'M',
    LISTENER = 'L'
}

/**
 *
 */
const factory = () => {
    const routes: Routes = {};
    const cache = creator('cache')<[Middleware[], Position]>();
    let position: Position = 0 as Position;

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
            .filter(Boolean) as Token[]
    );

    /**
     *
     * @param routes
     */
    const keys = (routes: Routes): Token[] => (
        Object.keys(routes)
            .reduce((acc, key) => {
                (key[0] !== ':')
                    ? acc[0].push(key)
                    : acc[1].push(key)
                ;

                return acc;
            }, [[], []])
            .flat() as Token[]
    );

    /**
     *
     * @param type
     * @param tokens
     * @param target
     * @param position
     * @param context
     */
    const insert = (type: Type, tokens: Token[], target, position: Position, context: Routes): boolean => {
        const token = tokens.shift();
        if (!token) {
            return true;
        }

        if (!context[token]) {
            context[token] = {};
            context[token][LISTENER] = [];
            context[token][MIDDLEWARES] = [];
        }

        if (tokens.length === 0) {
            if (type === Type.LISTENER) {
                context[token][LISTENER] = [
                    target,
                    position,
                ];
            } else {
                if (!Array.isArray(target)) {
                    target = [target];
                }

                for (const fn of target) {
                    context[token][MIDDLEWARES].push([
                        fn,
                        position,
                    ]);
                }
            }
        }

        return insert(type, tokens, target, position, context[token]);
    };

    /**
     *
     * @param type
     * @param tokens
     * @param context
     */
    const eject = <T>(type: Type, tokens: Token[], context: Routes) => {
        let token = tokens.shift();
        if (!token) {
            if (type === Type.LISTENER) {
                return context[LISTENER];
            }

            return context[MIDDLEWARES];
        } else if (context[WILDCARD]) {
            if (context[WILDCARD][LISTENER].length) {
                return context[WILDCARD][LISTENER];
            }

            return eject<T>(type, tokens, context[WILDCARD]);
        } else if (!context[token]) {
            token = keys(context)
                .find((route) => VARIABLE.test(route))
            ;

            if (!token) {
                return [] as unknown as T;
            }
        }

        return eject<T>(type, tokens, context[token]);
    };

    /**
     *
     * @param path
     * @param position
     */
    const reduce = (path: Path, position?: Position): Middleware[] => {
        const tokens = tokenize(Type.MIDDLEWARE, null, path);
        if (cache.has(tokens)) {
            const [middlewares, current] = cache.get(tokens);
            if (position == null || current < position) {
                return middlewares;
            }
        }

        /**
         *
         * @param acc
         * @param token
         * @param i
         * @param tokens
         */
        const reducer = (acc: Middleware[], token: Token, i: number, tokens: Token[]): Middleware[] => {
            const partial = tokens.slice(0, i + 1);
            const middlewares = eject<Array<[Middleware, Position]>>(Type.MIDDLEWARE, partial, routes)
                .filter(Boolean)
                .filter(([, current]) => position == null || current < position)
                .map(([fn]) => fn)
            ;

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
                .find((item) => item === current || VARIABLE.test(item))
            ;

            if (route && VARIABLE.test(route)) {
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
     * @param listener
     */
    const set = (method: Method, path: Path, listener: Listener | Middleware) => {
        const type = (!method)
            ? Type.MIDDLEWARE
            : Type.LISTENER
        ;

        const tokens = tokenize(type, method, path);
        cache.del(tokens);

        ++position;

        insert(type, tokens, listener, position, routes);
    };

    /**
     *
     * @param method
     * @param path
     */
    const get = (method: Method, path: Path): [Listener, Position] => {
        const token = tokenize(Type.LISTENER, method, path);

        return eject<[Listener, Position]>(Type.LISTENER, token, routes);
    };

    return {
        reduce,
        resolve,
        set,
        get,
    };
};

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 20.12.2020
 * Time: 23:15
 */
export default factory;
