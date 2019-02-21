const router = require('micro-r');
const {send} = require('micro');

// executes on route miss
// also, no middleware support
const fallback = (req, res) => {
    send(res, '404', 'WOOPS');
};

// initialize router with an optional fallback handle
const {on, use, register, route} = router(fallback);

// recursively register folder and subfolders
register('./routes');

// register custom routes
on('get', '/foo', async (res, req) => {
    send(res, 200, 'bar');
});

// register middleware
// executes on every route hit
use((next) => ({req, res}) => {
    // do middleware stuff here
    return next({req, res});
});

// export route/r to micro
module.exports = route;
