import {IncomingMessage, ServerResponse} from "http";

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 01.09.2020
 * Time: 11:57
 */
export type Handler = (req: IncomingMessage, res: ServerResponse) => void;