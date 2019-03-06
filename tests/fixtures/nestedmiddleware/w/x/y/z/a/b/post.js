const {send} = require('micro');

module.exports = async (req, res) => {
    res.data = ["foobar"];

    send(res, 200, {data: res.data});
};
