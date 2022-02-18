const {send} = require('micro');

module.exports = async (req, res, param) => {
    send(res, 200, {data: res.data});
};
