import {Method} from "./Method";
import {Handler} from "./Handler";

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 01.09.2020
 * Time: 10:51
 */
export type Route = {
    method: Method,
    handler: Handler,
    pathname: string,
}