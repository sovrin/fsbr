import {parse} from "url";
import {basename, extname, resolve} from "path";
import listenerFactory, {Event} from './listener';
import {getter, load, read, setter, stats} from "./utils";
import {Method, Methods, Route, Config, Keys, Handler, Middleware} from "./types";

/**
 *
 * @param fallback
 */
const factory = (fallback: Handler = null) => {
    const listener = listenerFactory();
    const bound: Record<string, Handler> = {};
    const handlers: Record<string, Handler> = {};
    const routes: Array<Route> = [];
    const middlewares: Array<Middleware> = [];
    const config: Config = {
        entry: 'index',
        ext: '.js',
    };

    if (!fallback) {
        fallback = (req, res) => {
            // last resort
            res.statusCode = 500;
            res.end()
        }
    }

    /**
     *
     * @param method
     * @param pathname
     */
    const tokenize = (method: Method, pathname: string): string => (
        `${method.toUpperCase()}:${(pathname === '') ? '/' : pathname}`
    );

    /**
     *
     * @param middlewares
     */
    const chain = (...middlewares: Array<Middleware>): Handler => async (req, res): Promise<void> => {
        let cursor = 0;

        middlewares = middlewares.flat()
            .filter(Boolean)
        ;

        /**
         *
         */
        const next = async () => {
            const step = middlewares[cursor++];

            if (!step) {
                return fallback(req, res);
            }

            try {
                return await step(req, res, next);
            } catch (error) {
                listener.emit(Event.ERROR, req, res, error);

                await next();
            }
        };

        return await next();
    };

    /**
     *
     * @param method
     * @param pathname
     * @param handler
     */
    const on = (method: Method, pathname: string, handler: Handler): void => {
        if (method === '*') {
            for (const method of Methods) {
                if (method === '*') {
                    continue;
                }

                on(method, pathname, handler);
            }
        }

        const route = tokenize(method, pathname);

        if (middlewares.length) {
            handler = chain(...middlewares, handler);
        }

        bound[route] = handler;
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
     * @param pathname
     * @returns {boolean}
     */
    const has = (method: Method, pathname: string): boolean => (
        !!get(method, pathname)
    );

    /**
     *
     * @param method
     * @param pathname
     * @returns {*}
     */
    const get = (method: Method, pathname: string): Handler | null => {
        const route = tokenize(method, pathname);

        return bound[route];
    };

    /**
     *
     * @param req
     * @param res
     * @returns {Promise<*>}
     */
    const route: Handler = async (req, res): Promise<void> => {
        let {url, method} = req;
        const {pathname} = parse(url, true);
        const len = pathname.length;

        const route = ((len === 1) || (pathname[len - 1] !== '/'))
            ? pathname
            : (pathname.substring(0, len - 1))
        ;

        if (has(method as Method, route)) {
            const handler = get(method as Method, route);

            return handler(req, res);
        }

        // no try/catch here
        // if fallback fails, all hope is lost
        return chain(...middlewares, fallback)(req, res);
    };

    /**
     *
     */
    const bind = async (): Promise<void> => {
        for (let {method, handler, pathname} of routes) {
            const steps = pathname.split('/')
                .filter(Boolean)
            ;

            const waterfall = getter(steps, handlers, '*');

            if (waterfall.length) {
                handler = chain(...waterfall, handler);
            }

            on(method, pathname, handler);
        }
    };

    /**
     *
     * @param base
     * @param cb
     */
    const register = async (base, cb?: Function): Promise<boolean> => {
        const {ext, entry} = config;

        base = resolve(base);

        /**
         *
         * @param path
         */
        const traverse = async (path): Promise<void> => {
            const absolute = resolve(path);

            try {
                const pointer = resolve(absolute, `${entry}${ext}`);
                let middleware = await load(pointer);

                if (middleware.default) {
                    middleware = middleware.default;
                }

                let pathname = path.replace(base, '')
                    .replace(/[\\/]/g, '.')
                    .slice(1)
                ;

                if (pathname === '') {
                    pathname = '*';
                }

                setter(pathname, middleware, handlers);
            } catch (e) {
                // hello darkness, my old friend
            }

            /**
             *
             * @param name
             */
            const bind = async (name: string): Promise<void> => {
                const pointer = resolve(absolute, name);

                if ((await stats(pointer)).isDirectory()) {
                    return traverse(pointer);
                }

                if (extname(pointer) !== ext) {
                    return;
                }

                const handler = await load(pointer);

                const method = basename(name, ext)
                    .toLowerCase() as Method
                ;

                const pathname = path.replace(base, '')
                    .replace(/\\/g, '/')
                ;

                routes.push({method, pathname, handler});
            };

            try {
                for (const file of await read(path)) {
                    await bind(file);
                }
            } catch (error) {
                listener.emit(Event.ERROR, null, null, error);
            }
        };

        await traverse(base);
        await bind();
        await listener.emit(Event.READY);
        cb && cb();

        return true;
    };

    /**
     *
     * @param target
     */
    const configure = (target: Keys | Partial<Config>): any => {
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
        listener,
    };
};

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 01.09.2020
 * Time: 10:46
 */
export default factory;
