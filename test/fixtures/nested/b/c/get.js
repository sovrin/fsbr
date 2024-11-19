const {flush} = require('../../../../utils');

module.exports = async (req, res) => {
    flush(res, 200, {ok: true});
};
