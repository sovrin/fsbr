import {promisify} from "util";
import {readdir, stat} from "fs";

/**
 *
 */
export const read = promisify(readdir);

/**
 *
 */
export const stats = promisify(stat);

/**
 *
 * @param name
 * @param value
 * @param context
 */
export const setter = (name, value, context) => {
    const splits = name.split('.');
    const step = splits.pop();

    for (let i = 0, step; context && (step = splits[i]); i++) {
        context = (step in context ? context[step] : context[step] = {});
    }

    return (context && step) && (context[step] = value);
};

/**
 *
 * @param path
 * @param context
 * @param wildcard
 */
export const getter = (path, context, wildcard) => {
    const root = context[wildcard];
    const fns = [root];

    path.slice(0)
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

    return [].concat(...fns)
        .filter(Boolean)
    ;
};

/**
 *
 * @param path
 */
export const load = async (path) => {
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