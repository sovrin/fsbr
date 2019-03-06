const {parse} = require('url');
const {resolve, basename} = require('path');
const {readdir, stat} = require('fs');
const {promisify} = require('util');

const read = promisify(readdir);
const stats = promisify(stat);

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/**
 *
 * @param path
 * @returns {AsyncIterableIterator<*>}
 */
async function* enumerate(path) {
    const files = await read(path);

    for (const file of files) {
        yield file;
    }
}

/**
 *
 * @param method
 * @param pathname
 * @returns {string}
 */
const key = (method, pathname) => `${method.toUpperCase()}:${(pathname === '') ? '/' : pathname}`;

/**
 *
 * @param fallback
 * @returns {{route: route, use: use, on: on, register: register}}
 */
const factory = (fallback) => {
    const routes = {};
    const middlewares = [];

    /**
     *
     * @param routes
     * @returns {*}
     */
    const chain = (routes) => routes.reduce(
        (prev, next) => (arg) => prev(next(arg)),
    );

    /**
     *
     * @param method
     * @param pathname
     * @param handler
     */
    const on = (method, pathname, handler) => {
        const route = key(method, pathname);

        if (middlewares.length) {
            handler = chain(middlewares)(handler);
        }

        routes[route] = handler;
    };

    /**
     *
     * @param middleware
     */
    const use = (middleware) => {
        middlewares.unshift(middleware);
    };

    /**
     *
     * @param method
     * @param pathname
     * @returns {boolean}
     */
    const has = (method, pathname) => {
        return !!get(method, pathname);
    };

    /**
     *
     * @param method
     * @param pathname
     * @returns {*}
     */
    const get = (method, pathname) => {
        const route = key(method, pathname);

        return routes[route];
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

            return handler(req, res, query, {});
        }

        if (fallback && middlewares.length) {
            fallback = chain(middlewares)(fallback);
        }

        return fallback && fallback(req, res, query, {});
    };

    /**
     *
     * @param basepath
     * @returns {Promise<void>}
     */
    const register = async (basepath) => {
        basepath = resolve(basepath);
        let middlewares = [];

        const traverse = async (path, level = 0) => {
            const absolute = resolve(path);

            try {
                const pointer = resolve(absolute, 'index.js');
                let middleware = require(pointer);

                if (middleware.length) {
                    middleware = chain(middleware);
                }

                middlewares = middlewares
                    .filter(m => m.level < level)
                    .concat({level, middleware})
                ;
            } catch (e) {
                // hello darkness, my old friend
            }

            const bind = async (name) => {
                const pointer = resolve(absolute, name);

                if ((await stats(pointer)).isDirectory()) {
                    return traverse(pointer, ++level);
                }

                let handler = require(pointer);

                const method = basename(name, '.js')
                    .toUpperCase()
                ;

                if (!METHODS.includes(method)) {
                    return;
                }

                const pathname = path
                    .replace(basepath, '')
                    .replace(/\\/g, '/')
                ;

                const chained = middlewares
                    .filter(middleware => middleware.level <= level)
                    .map(({middleware}) => middleware)
                ;

                if (chained.length) {
                    handler = chain(chained)(handler);
                }

                level--;
                on(method, pathname, handler);
            };

            for await (const file of enumerate(path)) {
                await bind(file);
            }
        };

        await traverse(basepath);
    };

    return {
        use,
        on,
        chain,
        route,
        register,
    };
};

/**
 * User: Oleg Kamlowski <n@sovrin.de>
 * Date: 20.02.2019
 * Time: 23:27
 *
 * @type {function(*=): {route: route, use: use, on: on, chain: chain, register: register}}
 */
module.exports = factory;
