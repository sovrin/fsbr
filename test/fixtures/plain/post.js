const {flush} = require('../../utils');

module.exports = [
    (req, res, next) => {
        if (!res.data) {
            res.data = ['a1'];
        }

        return next();
    },
    (req, res) => {
        flush(res, 200, {ok: true, data: res.data});
    },
];
