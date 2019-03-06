module.exports = [
    (next) => (req, res) => {
        if (!res.data) {
            res.data = ['a'];
        }

        return next(req, res);
    },
];
