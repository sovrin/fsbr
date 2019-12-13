module.exports = [
    (req, res, next) => {
        res.data.push('c');

        return next();
    },
];
