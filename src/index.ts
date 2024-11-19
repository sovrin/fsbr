import {readdirSync, statSync} from 'fs';
import {basename, extname, resolve} from 'path';

import routesClosure from './routes';

import type {
    Method,
    Config,
    Listener,
    Middleware,
    Router,
    Path,
    Request,
    Response,
    ErrorArgs,
    ListenerArgs,
    Parameters,
    Next,
} from './types';

const closure = (config: Config = {}): Router => {
    const routes = routesClosure();

    const {
        entry = 'index',
        ext = '.js',
    }: Config = config;

    const chain = <T> (...input: Array<Middleware | Listener>): (req: Request, res: Response, parameters?: Parameters) => Promise<T> => {
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
                    : [req, res, arg] as ListenerArgs;

                try {
                    // eslint-disable-next-line prefer-spread
                    return await fn.apply(null, args);
                } catch (error) {
                    return await next(error);
                }
            };

            return await next(null);
        };
    };

    const on = (method: Method, path: string, listener: Listener): void => {
        routes.set(method, path as Path, listener);
    };

    const use = (middleware: Middleware): void => {
        routes.set(null, null, middleware);
    };

    const has = (method: Method, path: string): boolean => {
        return routes.has(method, path as Path);
    };

    const route: Listener = async <T> (req: Request, res: Response): Promise<T> => {
        const {url, method, headers: {host}} = req;
        const {pathname} = new URL(url, `https://${host}`);

        const path = pathname as Path;
        const [listener, position] = routes.get(method, path);
        const middlewares = routes.reduce(path, position);
        const parameters = routes.resolve(method, path);

        const stack = [
            ...middlewares,
            listener,
        ].filter(Boolean);

        return chain<T>(...stack)(req, res, parameters);
    };

    const register = (base: string): boolean => {
        base = resolve(base);

        const traverse = (path: string): void => {
            const absolute = resolve(path);
            const pointer = resolve(absolute, `${entry}${ext}`);

            try {
                let middleware = require(pointer);
                if (middleware.default && typeof middleware.default === 'function') {
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

                let listener = require(pointer);
                if (listener.default && typeof listener.default === 'function') {
                    listener = listener.default;
                }

                const method = basename(name, ext)
                    .toUpperCase() as Method;

                const pathname = path.replace(base, '')
                    .replace(/\\/g, '/');

                on(method, pathname, listener);
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
    Listener,
    Response,
    Request,
    Next,
};
