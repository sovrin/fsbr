const {parse} = require('url');
const {resolve, basename} = require('path');
const {readdir} = require('fs');
const {promisify} = require('util');

const read = promisify(readdir);

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
     * @param method
     * @param pathname
     * @param handler
     */
    const on = (method, pathname, handler) => {
        const route = key(method, pathname);

        routes[route] = middlewares.reduce(
            (fn, next) => (next(fn)), handler,
        );
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

        if (has(method, pathname)) {
            const handler = get(method, pathname);
            return handler({req, res, query});
        }
        
        return fallback && fallback(req, res);
    };

    /**
     *
     * @param basepath
     * @returns {Promise<void>}
     */
    const register = async (basepath) => {
        basepath = resolve(basepath);

        const traverse = async (path) => {
            const absolute = resolve(path);

            const bind = async (name) => {
                const pointer = resolve(absolute, name);

                if (!name.includes('.js')) {
                    return traverse(pointer);
                }

                const handler = require(pointer);
                const method = basename(name, '.js');

                if (!METHODS.includes(method.toUpperCase())) {
                    return;
                }

                const pathname = path
                    .replace(basepath, '')
                    .replace(/\\/g, '/')
                ;

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
        route,
        register,
    };
};


/**
 * User: Oleg Kamlowski <n@sovrin.de>
 * Date: 20.02.2019
 * Time: 23:27
 * 
 * @type {function(*=): {route: route, use: use, on: on, register: register}}
 */
module.exports = factory;
