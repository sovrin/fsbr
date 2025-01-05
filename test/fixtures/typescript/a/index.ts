export default [
    (req, res, next) => {
        res.data.push('a1');

        return next();
    },
    (req, res, next) => {
        res.data.push('a2');

        return next();
    },
];
