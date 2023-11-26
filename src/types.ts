import {IncomingMessage, ServerResponse} from 'http';
import {LISTENERS, MIDDLEWARES, RESOLVER} from './const';

type Opaque<K, T> = T & { __TYPE__: K };

export type Request = IncomingMessage & {
    method: Method;
};

export type Response = ServerResponse;

export type Path = Opaque<'Path', string>;

export type Router = {
    use (middleware: Middleware): void,
    has (method: Method, path: string): boolean,
    on (method: Method, path: string, listener: Listener): unknown,
    chain (...pool: Array<Listener | Middleware>): Listener,
    route (req: Request, res: Response): unknown,
    register (base: string): boolean,
}

export type Config = {
    entry?: string,
    ext?: string,
    dev?: boolean,
};

export type Cache<T> = {
    has(tokens: Token[]): boolean,
    get(tokens: Token[]): T,
    set(tokens: Token[], value: T): Cache<T>,
    del(tokens: Token[]): void,
}

export type Method = typeof Methods[number];

export const Methods = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'CONNECT',
    'TRACE',
    'HEAD',
    'OPTIONS',
    '*',
] as const;

export type Parameters = Opaque<'Parameters', object>;

export type Listener = (req: Request, res: Response, params?: Parameters) => unknown;

export type Next = (error?: unknown) => Middleware;

export type Middleware = (req: Request, res: Response, next: Next, error?: unknown) => unknown;

export type Token = Opaque<'Token', string>;

export type Position = Opaque<'Position', number>;

export type Routes = {
    [LISTENERS]?: [
        Listener?,
        Position?,
        Token?,
    ],
    [MIDDLEWARES]?: Array<[
        Middleware,
        Position,
    ]>,
    [RESOLVER]?: {
        key: Token,
        variables: string[],
        type: 'static' | 'dynamic',
    },
    '*'?: Routes,
    [token: Token]: Routes;
}

export type ErrorArgs = [
    Request, Response, Next | Parameters, string
];

export type ListenerArgs = [
    Request, Response, Next | Parameters
];
