const {send} = require('micro');

module.exports = async (req, res, next) => {
    send(res, 200, {ok: true});
};
