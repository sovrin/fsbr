const {parse} = require('url');
const {resolve, basename} = require('path');
const {METHODS, WILDCARD, ENTRY, EXTENSION} = require('./const');
const {key, getter, setter, noop, stats, read, load} = require('./utils');

/**
 *
 * @param fallback
 * @returns {{route: route, use: use, on: on, register: register}}
 */
const factory = (fallback) => {
    const config = {
        entry: ENTRY,
        ext: EXTENSION,
    };
    const bound = {};
    const routes = [];
    const handlers = {};
    const middlewares = [];
    let callback = noop;

    /**
     *
     * @param middlewares
     * @returns {function(...[*]=)}
     */
    const chain = (...middlewares) => (req, res) => {
        let cursor = 0;

        middlewares = middlewares
            .flat()
            .filter(Boolean)
        ;

        const next = () => {
            const middleware = middlewares[cursor++];

            if (!middleware) {
                return () => callback();
            }

            try {
                middleware(req, res, next);
            } catch (error) {
                next();
            }
        };

        next();
    };

    /**
     *
     * @param method
     * @param pathname
     * @param handler
     */
    const on = (method, pathname, handler) => {
        if (method === WILDCARD) {
            for (const method of METHODS) {
                on(method, pathname, handler);
            }
        }

        const route = key(method, pathname);

        if (middlewares.length) {
            handler = chain(middlewares, handler);
        }

        bound[route] = handler;
    };

    /**
     *
     * @param middleware
     */
    const use = (middleware) => {
        middlewares.push(middleware);
    };

    /**
     *
     * @param method
     * @param pathname
     * @returns {boolean}
     */
    const has = (method, pathname) => (
        !!get(method, pathname)
    );

    /**
     *
     * @param method
     * @param pathname
     * @returns {*}
     */
    const get = (method, pathname) => {
        const route = key(method, pathname);

        return bound[route];
    };

    /**
     *
     * @param req
     * @param res
     * @returns {Promise<*>}
     */
    const route = async (req, res) => {
        const {url, method} = req;
        const {pathname} = parse(url, true);
        const len = pathname.length;

        const route = ((len === 1) || (pathname[len - 1] !== '/'))
            ? pathname
            : (pathname.substring(0, len - 1))
        ;

        if (has(method, route)) {
            const handler = get(method, route);

            return handler(req, res);
        }

        if (fallback) {
            fallback = chain(middlewares, fallback);
        }

        return fallback && fallback(req, res);
    };

    /**
     *
     * @param cb
     */
    const ready = (cb) => {
        callback = cb;
    };

    /**
     *
     */
    const bind = () => {
        for (let {method, handler, pathname} of routes) {
            const steps = pathname
                .split('/')
                .filter(Boolean)
            ;

            const waterfall = getter(steps, handlers, WILDCARD);

            if (waterfall.length) {
                handler = chain(waterfall, handler);
            }

            on(method, pathname, handler);
        }
    };

    /**
     *
     * @param base
     * @param cb
     */
    const register = async (base, cb = noop) => {
        const {ext, entry} = config;

        base = resolve(base);

        const traverse = async (path) => {
            const absolute = resolve(path);

            try {
                const pointer = resolve(absolute, `${entry}${ext}`);
                let middleware = await load(pointer);

                if (middleware.default) {
                    middleware = middleware.default;
                }

                let pathname = path
                    .replace(base, '')
                    .replace(/[\\/]/g, '.')
                    .slice(1)
                ;

                if (pathname === '') {
                    pathname = WILDCARD;
                }

                setter(pathname, middleware, handlers);
            } catch (e) {
                // hello darkness, my old friend
            }

            const bind = async (name) => {
                const pointer = resolve(absolute, name);

                if ((await stats(pointer)).isDirectory()) {
                    return traverse(pointer);
                }

                if (pointer.slice(-3) !== ext) {
                    return;
                }

                let handler = await load(pointer);

                const method = basename(name, ext)
                    .toUpperCase()
                ;

                if (!METHODS.includes(method)) {
                    return;
                }

                const pathname = path
                    .replace(base, '')
                    .replace(/\\/g, '/')
                ;

                routes.push({method, pathname, handler});
            };

            for (const file of await read(path)) {
                await bind(file);
            }
        };

        await traverse(base);
        bind();
        await callback();
        cb();
    };

    /**
     *
     * @param entries
     */
    const configure = (entries) => {
        for (const key in entries) {
            if (!entries.hasOwnProperty(key)) {
                continue;
            }

            const {[key]: value} = entries;

            config[key] = value;
        }
    };

    return {
        use,
        on,
        chain,
        route,
        register,
        configure,
        ready,
    };
};

/**
 * User: Oleg Kamlowski <n@sovrin.de>
 * Date: 20.02.2019
 * Time: 23:27
 *
 * @type {function(*=): {route: route, use: use, on: on, chain: chain, register: register, ready: ready}}
 */
module.exports = factory;
