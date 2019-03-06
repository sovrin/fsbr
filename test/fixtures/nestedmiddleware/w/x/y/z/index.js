module.exports = [
    (next) => (req, res) => {
        res.data.push('z');

        return next(req, res);
    },
];
