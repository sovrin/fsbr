module.exports = [
    (req, res, next) => {
        res.data.push('w_index');

        return next();
    },
];
