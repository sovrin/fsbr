import {IncomingMessage, ServerResponse} from "http";
import {Listener, Listeners} from "./types";

export enum Event {
    ERROR = 'error',
    READY = 'ready'
}

/**
 *
 */
const factory = () => {
    const listeners: Listeners = [];

    /**
     *
     * @param event
     * @param listener
     */
    const on = (event: Event, listener: Listener): Function => {
        listeners.push({
            event,
            listener,
        });

        return () => off(event, listener);
    }

    /**
     *
     * @param event
     * @param listener
     */
    const off = (event: Event, listener: Function): boolean => {
        const index = listeners.findIndex((value) => (
            value.event === event && value.listener === listener
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

            listener.listener(req, res, payload);
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