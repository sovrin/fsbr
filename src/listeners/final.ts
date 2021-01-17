import {Request, Response, Next} from "../types";

/**
 *
 * @param dev
 */
const factory = ({dev = false}) => {

    /**
     *
     */
    return (req: Request, res: Response, next: Next, error: any) => {

        if (res.headersSent) {
            return;
        }

        res.statusCode = 500;

        if (dev && error) {
            const names = Object.getOwnPropertyNames(error);
            const string = JSON.stringify(error, names);

            res.setHeader('Content-Type', 'application/json');
            res.end(string);
        }

        res.end();
    };
};

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 27.12.2020
 * Time: 14:59
 */
export default factory;