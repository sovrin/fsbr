module.exports = [
    (next) => (req, res) => {
        res.data.push('y');

        return next(req, res);
    },
];
