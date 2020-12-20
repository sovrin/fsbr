import {IncomingMessage, ServerResponse} from "http";
import {Event} from "./listener";

export type Keys = "entry" | "ext";

export type Config = {
    entry?: string,
    ext?: string,
};

export type Handler = (req: IncomingMessage, res: ServerResponse) => void;

export type Listener = (req: IncomingMessage, res: ServerResponse, payload: any) => void;

export type Listeners = Array<{
    event: Event,
    listener: Listener
}>

export const Methods = [
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'head',
    'options',
    '*',
] as const;

export type Method = typeof Methods[number];

export type Middleware = (req: IncomingMessage, res: ServerResponse, next: Function) => void;

export type Route = {
    method: Method,
    handler: Handler,
    pathname: string,
}