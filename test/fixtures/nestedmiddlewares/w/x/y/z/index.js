module.exports = [
    (req, res, next) => {
        res.data.push('z_index');

        return next();
    },
];
