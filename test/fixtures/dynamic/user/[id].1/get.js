const {send} = require('micro');

module.exports = async (req, res, match) => {
    send(res, 200, match);
};
