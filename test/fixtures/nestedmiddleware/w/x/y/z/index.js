module.exports = [
    (req, res, next) => {
        res.data.push('z');

        return next();
    },
];
