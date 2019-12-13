const {parse} = require('url');
const {resolve, basename} = require('path');
const {readdir, stat} = require('fs');
const {promisify} = require('util');

const read = promisify(readdir);
const stats = promisify(stat);

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const WILDCARD = '*';

/**
 *
 * @param method
 * @param pathname
 * @returns {string}
 */
const key = (method, pathname) => (`${method.toUpperCase()}:${(pathname === '')
    ? '/'
    : pathname}`
);

/**
 *
 * @param name
 * @param value
 * @param context
 * @returns {undefined}
 */
const setter = (name, value, context) => {
    const splits = name.split('.');
    const step = splits.pop();

    for (let i = 0, step; context && (step = splits[i]); i++) {
        context = (step in context ? context[step] : context[step] = {});
    }

    return (context && step)
        ? (context[step] = value)
        : undefined
    ;
};

/**
 *
 * @param path
 * @param context
 * @returns {*}
 */
const getter = (path, context) => {
    const root = context[WILDCARD];
    const fns = [root];

    path
        .slice(0)
        .reduce((acc, step, i, arr) => {
            const {[step]: cursor} = acc;

            if (cursor === undefined) {
                // eject
                arr.splice(1);
            } else if (cursor.constructor === Function || cursor.constructor === Array) {
                fns.push(cursor);
            }

            return cursor;
        }, context)
    ;

    return fns
        .filter(Boolean)
        .flat()
    ;
};

/**
 *
 * @param fallback
 * @returns {{route: route, use: use, on: on, register: register}}
 */
const factory = (fallback) => {
    const bound = {};
    const routes = [];
    const handlers = {};
    const middlewares = [];
    let callback = () => {};

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
        const {pathname, query} = parse(url, true);
        const len = pathname.length;

        const route = ((len === 1) || (pathname[len - 1] !== '/'))
            ? pathname
            : (pathname.substring(0, len - 1))
        ;

        if (has(method, route)) {
            const handler = get(method, route);

            return handler(req, res, query);
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

            const waterfall = getter(steps, handlers);

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
    const register = async (base, cb = () => {}) => {
        base = resolve(base);

        const traverse = async (path) => {
            const absolute = resolve(path);

            try {
                const pointer = resolve(absolute, 'index.js');
                let middleware = require(pointer);

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

                if (pointer.slice(-3) !== '.js') {
                    return;
                }

                let handler = require(pointer);

                if (handler.default && typeof handler.default === 'function') {
                    handler = handler.default;
                }

                const method = basename(name, '.js')
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

    return {
        use,
        on,
        chain,
        route,
        register,
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
