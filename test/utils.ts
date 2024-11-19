import type {Response} from '../src';

export const flush = (res: Response, status: number, payload?: unknown) => {
    let str = payload;

    if (typeof payload === 'object' || typeof payload === 'number') {
        str = JSON.stringify(payload);

        if (!res.getHeader('Content-Type')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
    }

    if (typeof str === 'string') {
        res.setHeader('Content-Length', Buffer.byteLength(str));
    }

    res.statusCode = status;
    res.end(str);
};

export const noop = () => undefined;
