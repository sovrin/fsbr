import {IncomingMessage, ServerResponse} from 'http';
import {LISTENER} from './routes';

type Opaque<K, T> = T & { __TYPE__: K };

export type Request = IncomingMessage & {
    method: Method,
};

export type Response = ServerResponse;

export type Path = Opaque<'Path', string>;

export type Router = {
    use(middleware: Middleware): void,
    has(method: Method, path: string): boolean,
    on(method: Method, path: string, listener: Listener): void,
    chain(...middlewares: (Listener | Middleware)[]): Listener,
    route(req: Request, res: Response): Promise<any>,
    register(base: string, cb?: () => void): void,
}

export type Config = {
    entry?: string,
    ext?: string,
    dev?: boolean,
};

export type Cache = {
    has(tokens: Token[]): boolean,
    get(tokens: Token[]): Middleware[],
    set(tokens: Token[], value: Middleware[]): Cache,
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

export type Token = string;

export type Routes = {
    [LISTENER]?: Listener | Middleware
    [key: string]: Routes;
}

export type ErrorArgs = [
    Request, Response, Next | Parameters, string
];

export type ListenerArgs = [
    Request, Response, Next | Parameters
]
