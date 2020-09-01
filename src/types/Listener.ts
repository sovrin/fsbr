import {Event} from "../listener";
import {IncomingMessage, ServerResponse} from "http";

export type Handler = (req: IncomingMessage, res: ServerResponse, payload: any) => void;

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 01.09.2020
 * Time: 12:54
 */
export type Listener = {
    event: Event,
    handler: Handler
}