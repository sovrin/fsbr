import {flush} from '../../../utils';

export default [
    (req, res, next) => {
        res.data.push('h1');

        return next();
    },
    (req, res) => {
        flush(res, 200, res.data);
    },
];
