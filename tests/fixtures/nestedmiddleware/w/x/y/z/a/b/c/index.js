module.exports = [
    (next) => (req, res) => {
        res.data.push('c');

        return next(req, res);
    },
];
