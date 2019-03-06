module.exports = [
    (next) => (req, res) => {
        if (!res.data) {
            res.data = ['foo'];
        }

        return next(req, res);
    },
];
