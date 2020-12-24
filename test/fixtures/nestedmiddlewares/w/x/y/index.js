module.exports = [
    (req, res, next) => {
        res.data.push('y');

        return next();
    },
];
