import {parse} from "url";
import {readdirSync, statSync} from "fs";
import {basename, extname, resolve} from "path";
import routesFactory from './routes';
import {Method, Config, Keys, Handler, Middleware, Router, Middlewares, Methods, Path} from "./types";

/**
 *
 * @param fallback
 */
const factory = (fallback: Handler = null): Router => {
    const routes = routesFactory();
    const middlewares: Middlewares = [];
    const config: Config = {
        entry: 'index',
        ext: '.js',
        dev: false,
    };

    if (!fallback) {
        // last resort
        fallback = (req, res, error) => {
            res.statusCode = 500;

            if (config.dev) {
                const names = Object.getOwnPropertyNames(error);
                const string = JSON.stringify(error, names);

                res.setHeader('Content-Type', 'application/json');

                return res.end(string);
            }

            res.end();
        };
    }

    /**
     *
     * @param handlers
     */
    const chain = (...handlers: Array<Function>): Handler => {
        return async (req, res, variables): Promise<void> => {
            handlers = [].concat(...handlers)
                .filter(Boolean)
            ;

            /**
             *
             */
            const next = async () => {
                const handler = handlers.shift();
                const param = (handlers.length === 0)
                    ? variables
                    : next
                ;

                try {
                    return await handler(req, res, param);
                } catch (error) {
                    return await fallback(req, res, error);
                }
            };

            return await next();
        };
    };

    /**
     *
     * @param method
     * @param path
     * @param handler
     */
    const on = (method: Method, path: string, handler: Handler): void => {
        if (method === '*') {
            for (const method of Methods) {
                if (method === '*') {
                    continue;
                }

                on(method, path, handler);
            }

            return;
        }

        if (middlewares.length) {
            handler = chain(...middlewares, handler);
        }

        routes.set(method, path as Path, handler);
    };

    /**
     *
     * @param middleware
     */
    const use = (middleware: Middleware): void => {
        middlewares.push(middleware);
    };

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
    const route: Handler = async (req, res): Promise<any> => {
        const {url, method} = req;
        const {pathname} = parse(url, true) as any;
        const handler = routes.get(method, pathname);

        if (!handler) {
            return chain(...middlewares, fallback)(req, res);
        }

        const resolved = routes.resolve(method, pathname);
        const waterfall = [].concat(middlewares)
            .concat(routes.reduce(pathname))
        ;

        return chain(...waterfall, handler)(req, res, resolved);
    };

    /**
     *
     * @param base
     * @param cb
     */
    const register = (base: string, cb?: Function): void => {
        const {ext, entry} = config;

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

                let handler = require(pointer);

                if (handler.default && typeof handler.default === 'function') {
                    handler = handler.default;
                }

                const method = basename(name, ext)
                    .toUpperCase() as Method
                ;

                const pathname = path.replace(base, '')
                    .replace(/\\/g, '/')
                    .replace(/\[(.*?)\]/g, ':$1') as Path
                ;

                routes.set(method, pathname, handler);
            };

            for (const file of readdirSync(path)) {
                bind(file);
            }
        };

        traverse(base);
        cb && cb();
    };

    /**
     *
     * @param target
     */
    const configure = (target: Keys | Partial<Config>): Config | any => {
        if (typeof target === "string") {
            return config[target];
        }

        for (const key of Object.keys(target)) {
            config[key] = target[key];
        }

        return config;
    };

    return {
        use,
        has,
        on,
        chain,
        route,
        register,
        configure,
    };
};

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 01.09.2020
 * Time: 10:46
 */
export default factory;