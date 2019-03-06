module.exports = [
    (next) => (req, res) => {
        res.data.push('buz');

        return next(req, res);
    },
];
