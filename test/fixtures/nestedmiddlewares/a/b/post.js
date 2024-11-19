const {flush} = require('./../../../../utils');

module.exports = async (req, res) => {
    res.data = ['foobar'];

    flush(res, 200, {data: res.data});
};
