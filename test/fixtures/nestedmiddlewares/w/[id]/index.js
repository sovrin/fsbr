module.exports = [
    (req, res, next) => {
        res.data.push('wildcard_index');

        return next();
    },
];
