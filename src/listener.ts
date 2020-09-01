import {Listener, Handler} from "./types/Listener";
import {IncomingMessage, ServerResponse} from "http";

export enum Event {
    ERROR = 'error',
    READY = 'ready'
}

/**
 *
 */
const factory = () => {
    const listeners: Array<Listener> = [];

    /**
     *
     * @param event
     * @param handler
     */
    const on = (event: Event, handler: Handler): Function => {
        listeners.push({
            event,
            handler,
        });

        return () => off(event, handler);
    }

    /**
     *
     * @param event
     * @param handler
     */
    const off = (event: Event, handler: Function): boolean => {
        const index = listeners.findIndex((value) => (
            value.event === event && value.handler === handler
        ));

        if (index === -1) {
            return false;
        }

        listeners.splice(index, 1);

        return true;
    };

    /**
     *
     * @param event
     * @param req
     * @param res
     * @param payload
     */
    const emit = (event: Event, req?: IncomingMessage, res?: ServerResponse, payload?: any): void => {
        for (const listener of listeners) {
            if (listener.event !== event) {
                continue;
            }

            listener.handler(req, res, payload);
        }
    };

    return {
        on,
        off,
        emit,
    }
};

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 01.09.2020
 * Time: 13:14
 */
export default factory;