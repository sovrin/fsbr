import {IncomingMessage, ServerResponse} from "http";

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 01.09.2020
 * Time: 12:42
 */
export type Middleware = (req: IncomingMessage, res: ServerResponse, next: Function) => void;