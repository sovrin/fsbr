const {flush} = require('../../../../utils');

module.exports = async (req, res, param) => {
    flush(res, 200, {data: res.data});
};
