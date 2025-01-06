import {readdirSync, statSync} from 'fs';
import {basename, extname, resolve} from 'path';

import routesClosure from './routes';

import type {
    Method,
    Config,
    Handler,
    Middleware,
    Router,
    Path,
    Request,
    Response,
    ErrorArgs,
    HandlerArgs,
    Parameters,
    Next,
    Listener,
} from './types';

const closure = (config: Config = {}): Router => {
    const routes = routesClosure();

    const {
        entry = 'index',
        ext = '.js',
    }: Config = config;

    const chain = <T> (
        ...input: Array<Middleware | Handler>
    ): (req: Request, res: Response, parameters?: Parameters) => Promise<T> => {
        input = Array.from(input)
            .filter(Boolean);

        return async (req: Request, res: Response, parameters?: Parameters): Promise<T> => {
            let fns = input.filter((fn) => (
                fn.length !== 4
            ));

            const next = async (error: unknown = null) => {
                if (error && input) {
                    fns = input.filter((fn) => (
                        fn.length === 4
                    ));

                    input = null;
                }

                const fn = fns.shift();
                if (!fn) {
                    return undefined;
                }

                const arg = (fns.length == 0 && !error)
                    ? parameters
                    : next;

                const args = (fn.length === 4)
                    ? [req, res, arg, error] as ErrorArgs
                    : [req, res, arg] as HandlerArgs;

                try {
                    // eslint-disable-next-line prefer-spread
                    return await fn.apply(null, args);
                } catch (error) {
                    return next(error);
                }
            };

            return next(null);
        };
    };

    const on = (method: Method, path: string, handler: Handler): void => {
        routes.set(method, path as Path, handler);
    };

    const use = (middleware: Middleware): void => {
        routes.set(null, null, middleware);
    };

    const has = (method: Method, path: string): boolean => {
        return routes.has(method, path as Path);
    };

    const route: Handler = async <T>(req: Request, res: Response): Promise<T> => {
        const {url, method, headers: {host}} = req;
        const pathname = new URL(url, `https://${host}`).pathname as Path;

        const [match, middlewares, parameters] = (() => {
            const [handler, position] = routes.get(method, pathname);

            return [
                Array.isArray(handler)
                    ? chain(...handler)
                    : handler,
                routes.reduce(pathname, position),
                routes.resolve(method, pathname),
            ];
        })();

        return chain<T>(...middlewares, match)(req, res, parameters);
    };

    const register = (base: string): boolean => {
        base = resolve(base);

        const traverse = (path: string): void => {
            const absolute = resolve(path);
            const pointer = resolve(absolute, `${entry}${ext}`);

            try {
                let middleware = require(pointer);
                if (middleware.default && (typeof middleware.default === 'function' || Array.isArray(middleware.default))) {
                    middleware = middleware.default;
                }

                const pathname = path.replace(base, '')
                    .replace(/[\\/]/g, '/')
                    .slice(1) as Path;

                routes.set(null, pathname, middleware);
            } catch (e) {
                // hello darkness, my old friend
            }

            const bind = (name: string): void => {
                const pointer = resolve(absolute, name);
                if (statSync(pointer).isDirectory()) {
                    return traverse(pointer);
                }

                if (extname(pointer) !== ext || basename(name, ext) === entry) {
                    return;
                }

                let handler = require(pointer);
                if (handler.default && (typeof handler.default === 'function' || Array.isArray(handler.default))) {
                    handler = handler.default;
                }

                const method = basename(name, ext)
                    .toUpperCase() as Method;

                const pathname = path.replace(base, '')
                    .replace(/\\/g, '/');

                on(method, pathname, handler);
            };

            for (const file of readdirSync(path)) {
                bind(file);
            }
        };

        traverse(base);

        return true;
    };

    return {
        use,
        has,
        on,
        chain,
        route,
        register,
    };
};

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 01.09.2020
 * Time: 10:46
 */
export default closure;
export type {
    Middleware,
    Config,
    Method,
    Handler,
    Response,
    Request,
    Next,
    Listener,
};
