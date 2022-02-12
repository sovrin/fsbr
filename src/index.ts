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
    const chain = (...pool: Array<Listener | Middleware>): any => {
        pool = Array.from(pool)
            .filter(Boolean)
        ;

        if (pool.length === 1) {
            return pool[0];
        }

        /**
         *
         * @param req
         * @param res
         * @param parameters
         */
        return async (req: Request, res: Response, parameters?: Parameters): Promise<void> => {
            let listeners = pool.filter((listener) => (
                listener.length !== 4
            ));

            /**
             *
             * @param error
             */
            const next = async (error: unknown = null) => {
                if (error && pool) {
                    listeners = pool.filter((listener) => (
                        listener.length === 4
                    ));

                    pool = null;
                }

                const listener = listeners.shift();

                if (!listener) {
                    return final(req, res, null, error);
                }

                const arg = (listeners.length == 0 && !error)
                    ? parameters
                    : next
                ;

                const args = (listener.length === 4)
                    ? [req, res, arg, error] as ErrorArgs
                    : [req, res, arg] as ListenerArgs
                ;

                try {
                    return await listener.apply(null, args);
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
    function use (middleware: Middleware): void {
        routes.set(null, null, middleware);
    }

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
    const route: Listener = async <T>(req, res): Promise<T> => {
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

        return chain(...stack)(req, res, parameters);
    };

    /**
     *
     * @param base
     * @param cb
     */
    const register = (base: string, cb?: () => void): void => {
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
                    .replace(/\[(.*?)\]/g, ':$1') as Path
                ;

                on(method, pathname, listener);
            };

            for (const file of readdirSync(path)) {
                bind(file);
            }
        };

        traverse(base);
        cb && cb();
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
export type {Middleware, Config, Method, Listener, Response, Request};
