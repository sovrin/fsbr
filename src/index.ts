import {parse} from 'url';
import {readdirSync, statSync} from 'fs';
import {basename, extname, resolve} from 'path';
import {final as finalListener} from './listeners';
import routesFactory from './routes';
import {
    Method,
    Config,
    Listener,
    Middleware,
    Router,
    Middlewares,
    Path,
    Request,
    Response,
} from './types';

/**
 *
 */
const factory = (config: Config = {}): Router => {
    const routes = routesFactory();
    const final = finalListener(config);
    const middlewares: Middlewares = [];

    const {
        entry = 'index',
        ext = '.js',
    } = config;

    /**
     *
     * @param pool
     */
    const chain = (...pool: Array<Listener | Middleware>): any => {
        if (pool.length === 1) {
            return pool[0];
        }

        pool = [].concat(...pool)
            .filter(Boolean)
        ;

        /**
         *
         * @param req
         * @param res
         * @param parameters
         */
        return async (req: Request, res: Response, params?: string | number): Promise<void> => {
            let listeners = pool.filter(
                (listener) => listener.length !== 4,
            );

            let errorListeners = pool.filter(
                (listener) => listener.length === 4,
            );

            /**
             *
             * @param error
             */
            const next = async (error: any = null) => {
                if (error && errorListeners.length) {
                    listeners = [
                        ...errorListeners,
                        ...listeners,
                    ];

                    errorListeners = [];
                }

                const listener = listeners.shift();

                if (!listener) {
                    return final(req, res, null, error);
                }

                const current = (listeners.length == 0 && !error)
                    ? params
                    : next
                ;

                const args = (listener.length === 4)
                    ? [req, res, current, error]
                    : [req, res, current]
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
        listener = chain(...middlewares, listener);

        routes.set(method, path as Path, listener);
    };


    function use(middleware: Middleware) {
        middlewares.push(middleware);
    }

    /**
     *
     * @param method
     * @param path
     * @returns {boolean}
     */
    const has = (method: Method, path: string): boolean => (
        !!routes.get(method, path as Path)
    );

    /**
     *
     * @param req
     * @param res
     */
    const route: Listener = async (req, res): Promise<any> => {
        const {url, method} = req;
        const {pathname} = parse(url, true) as any;
        const listener = routes.get(method, pathname) as Listener;

        if (!listener) {
            return chain(...middlewares, final)(req, res);
        }

        const parameters = routes.resolve(method, pathname);
        const reduced = routes.reduce(pathname);

        return chain(...reduced, listener, final)(req, res, parameters);
    };

    /**
     *
     * @param base
     * @param cb
     */
    const register = (base: string, cb?: Function): void => {
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
