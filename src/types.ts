import {IncomingMessage, ServerResponse} from "http";
import {LISTENER} from "./routes";

export type Request = IncomingMessage & {
    method: Method,
};

export type Response = ServerResponse;

export type Path = string & {
    path: 'path'
};

export type Router = {
    use(middleware: Middleware): void,
    has(method: Method, path: string): boolean,
    on(method: Method, path: string, listener: Listener): void,
    chain(...middlewares: Array<Listener | Middleware>): Listener,
    route(req: Request, res: Response): Promise<any>,
    register(base: string, cb?: Function): void,
}

export type Config = {
    entry?: string,
    ext?: string,
    dev?: boolean,
};

export type Cache = {
    has(tokens: Array<string>): boolean,
    get(tokens: Array<string>): any,
    set(tokens: Array<string>, value: any): Cache,
    del(tokens: Array<string>),
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

export type Listener = (req: Request, res: Response, params?: string | number) => any;

export type Next = (error?: any) => Middleware;

export type Middleware = (req: Request, res: Response, next: Next, error?: any) => void;

export type Middlewares = Array<Middleware>;

export type Token = string;

export type Tokens = Array<Token>;

export type Routes = {
    [LISTENER]?: Listener | Middleware
    [key: string]: Routes;
}