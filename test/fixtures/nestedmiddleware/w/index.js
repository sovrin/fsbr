module.exports = [
    (req, res, next) => {
        res.data.push('w');

        return next();
    },
];
