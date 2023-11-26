import {readdirSync, statSync} from 'fs';
import {basename, extname, resolve} from 'path';
import creator from './creator';

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

/**
 *
 */
const factory = (config: Config = {}): Router => {
    const routes = creator('routes')();
    const final = creator('final')(config);

    const {
        entry = 'index',
        ext = '.js',
    }: Config = config;

    /**
     *
     * @param pool
     */
    const chain = <T >(...pool: Array<Middleware | Listener>): (req: Request, res: Response, parameters?: Parameters) => Promise<T> => {
        pool = Array.from(pool)
            .filter(Boolean)
        ;

        /**
         *
         * @param req
         * @param res
         * @param parameters
         */
        return async (req: Request, res: Response, parameters?: Parameters): Promise<T> => {
            let fns = pool.filter((fn) => (
                fn.length !== 4
            ));

            /**
             *
             * @param error
             */
            const next = async (error: unknown = null) => {
                if (error && pool) {
                    fns = pool.filter((fn) => (
                        fn.length === 4
                    ));

                    pool = null;
                }

                const fn = fns.shift();
                if (!fn) {
                    return final(req, res, null, error);
                }

                const arg = (fns.length == 0 && !error)
                    ? parameters
                    : next
                ;

                const args = (fn.length === 4)
                    ? [req, res, arg, error] as ErrorArgs
                    : [req, res, arg] as ListenerArgs
                ;

                try {
                    // eslint-disable-next-line prefer-spread
                    return await fn.apply(null, args);
                } catch (error) {
                    await next(error);
                }
            };

            return await next(null);
        };
    };

    /**
     *
     * @param method
     * @param path
     * @param listener
     */
    const on = (method: Method, path: string, listener: Listener): void => {
        routes.set(method, path as Path, listener);
    };

    /**
     *
     * @param middleware
     */
    const use = (middleware: Middleware): void => {
        routes.set(null, null, middleware);
    };

    /**
     *
     * @param method
     * @param path
     * @returns {boolean}
     */
    const has = (method: Method, path: string): boolean => (
        !!routes.get(method, path as Path).length
    );

    /**
     *
     * @param req
     * @param res
     */
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
            final,
        ].filter(Boolean);

        return chain<T>(...stack)(req, res, parameters);
    };

    /**
     *
     * @param base
     */
    const register = (base: string): boolean => {
        base = resolve(base);

        /**
         *
         * @param path
         */
        const traverse = (path: string): void => {
            const absolute = resolve(path);

            try {
                const pointer = resolve(absolute, `${entry}${ext}`);
                let middleware = require(pointer);

                if (middleware.default && typeof middleware.default === 'function') {
                    middleware = middleware.default;
                }

                const pathname = path.replace(base, '')
                    .replace(/[\\/]/g, '/')
                    .slice(1) as Path
                ;

                routes.set(null, pathname, middleware);
            } catch (e) {
                // hello darkness, my old friend
            }

            /**
             *
             * @param name
             */
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
                    .toUpperCase() as Method
                ;

                const pathname = path.replace(base, '')
                    .replace(/\\/g, '/')
                ;

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
export default factory;
export type {
    Middleware,
    Config,
    Method,
    Listener,
    Response,
    Request,
    Next,
};
