const {promisify} = require('util');
const {readdir, stat} = require('fs');

/**
 *
 * @type {(arg1: (string | Buffer | URL)) => Promise<string[]>}
 */
const read = promisify(readdir);

/**
 *
 * @type {(arg1: (string | Buffer | URL)) => Promise<Stats>}
 */
const stats = promisify(stat);

/**
 *
 * @param method
 * @param pathname
 * @returns {string}
 */
const key = (method, pathname) => (
    `${method.toUpperCase()}:${(pathname === '') ? '/' : pathname}`
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
 * @param wildcard
 * @returns {*}
 */
const getter = (path, context, wildcard) => {
    const root = context[wildcard];
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
 * @param path
 * @returns {Promise<any>}
 */
const load = async (path) => {
    let target;

    try {
        target = await import(path);
    } catch (e) {
        target = require(path);
    }

    if (target.default && typeof target.default === 'function') {
        target = target.default;
    }

    return target;
};

/**
 *
 */
const noop = () => {
    // no operation
};

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 10.01.2020
 * Time: 08:00
 */
module.exports = {
    setter,
    getter,
    key,
    noop,
    read,
    load,
    stats,
};
