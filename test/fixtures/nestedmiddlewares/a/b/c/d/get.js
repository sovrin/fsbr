const {flush} = require('../../../../../../utils');

module.exports = async (req, res) => {
    res.data.push('d');

    flush(res, 200, {data: res.data});
};
