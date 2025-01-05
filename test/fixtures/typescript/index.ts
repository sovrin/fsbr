export default (req, res, next) => {
    if (!res.data) {
        res.data = ['i1'];
    }

    return next();
}
