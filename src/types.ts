import {IncomingMessage, ServerResponse} from "http";
import {HANDLER} from "./routes";

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
    on(method: Method, path: string, handler: Handler): void,
    chain(...middlewares: Middlewares): Handler,
    route(req: Request, res: Response): Promise<any>,
    register(base: string, cb?: Function): void,
    configure(target: Keys | Partial<Config>): any,
}

export type Keys = "entry" | "ext";

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

export type Handler = (req: Request, res: Response, variables?: object) => any;

export type Method = typeof Methods[number];

export const Methods = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'HEAD',
    'OPTIONS',
    '*',
] as const;

export type Middleware = (req: Request, res: Response, next?: Function) => void;

export type Middlewares = Array<Middleware>;

export type Token = string;

export type Tokens = Array<Token>;

export type Routes = {
    [HANDLER]?: Handler | Middleware
    [key: string]: Routes;
}