module.exports = [
    (req, res, next) => {
        if (!res.data) {
            res.data = ['a1'];
        }

        return next();
    },
    (req, res, next) => {
        res.data.push('a2');

        return next();
    },
];
