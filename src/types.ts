import {IncomingMessage, ServerResponse} from 'http';
import {LISTENER, MIDDLEWARES} from './routes';

type Opaque<K, T> = T & { __TYPE__: K };

export type Request = IncomingMessage & {
    method: Method;
};

export type Response = ServerResponse;

export type Path = Opaque<'Path', string>;

export type Router = {
    use(middleware: Middleware): void,
    has(method: Method, path: string): boolean,
    on(method: Method, path: string, listener: Listener): void,
    chain(...pool: Array<Listener | Middleware>): Listener,
    route<T>(req: Request, res: Response): Promise<T>,
    register(base: string, cb?: () => void): void,
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
    del(tokens: Token[]),
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

export type Listener = (req: Request, res: Response, params?: Parameters) => any;

export type Next = (error?: any) => Middleware;

export type Middleware = (req: Request, res: Response, next: Next, error?: any) => void;

export type Token = Opaque<'Token', string>;

export type Position = Opaque<'Position', number>;

export type Routes = {
    [LISTENER]?: [
        Listener?,
        Position?,
    ],
    [MIDDLEWARES]?: Array<[
        Middleware,
        Position,
    ]>,
    [token: Token]: Routes;
}

export type ErrorArgs = [
    Request, Response, Next | Parameters, string
];

export type ListenerArgs = [
    Request, Response, Next | Parameters
];
