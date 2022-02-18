module.exports = [
    (req, res, next) => {
        res.data.push('y_index');

        return next();
    },
];
