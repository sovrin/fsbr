const {flush} = require('../../../../utils');

module.exports = async (req, res, match) => {
    flush(res, 200, match);
};
