const {send} = require('micro');

module.exports = async (req, res) => {
    res.data.push('final');

    send(res, 200, {data: res.data});
};
