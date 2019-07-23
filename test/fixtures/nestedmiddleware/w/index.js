module.exports = [
    (next) => (req, res) => {
        res.data.push('w');

        return next(req, res);
    },
];
