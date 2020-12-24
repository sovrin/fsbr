export default (req, res, next) => {
    if (!res.data) {
        res.data = ['foo'];
    }

    return next();
}
