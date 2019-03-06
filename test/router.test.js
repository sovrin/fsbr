const {send} = require('micro');
const router = require('../lib/router');
const request = require('supertest');

describe('micro-r', () => {
    describe('initialize with fallback', () => {
        const {on, route} = router((req, res) => {
            send(res, 404);
        });

        it('should respond 200 to GET:/custom', (done) => {
            on('get', '/custom', (req, res) => {
                send(res, 200);
            });

            request(route)
                .get('/custom')
                .expect(200, done)
            ;
        });

        it('should respond 200 to GET:/custom', (done) => {
            on('get', '/custom', (req, res) => {
                send(res, 200);
            });

            request(route)
                .get('/custom')
                .expect(200, done)
            ;
        });

        it('should respond 404 of fallback', (done) => {
            request(route)
                .get('/foo')
                .expect(404, done)
            ;
        });
    });

    describe('initialize with fallback and middleware', () => {
        const {on, use, route} = router((req, res) => {
            send(res, 404, {ok: false});
        });

        use((next) => (req, res) => {
            res.data = 123;

            next(req, res);
        });

        it('should respond 200 to GET:/custom', (done) => {
            on('get', '/custom', (req, res) => {
                send(res, 200, {data: res.data});
            });

            request(route)
                .get('/custom')
                .expect('Content-Type', /json/)
                .expect({'data': 123})
                .expect(200, done)
            ;
        });

        it('should respond 404 of fallback', (done) => {
            request(route)
                .get('/foo')
                .expect('Content-Type', /json/)
                .expect({'ok': false})
                .expect(404, done)
            ;
        });
    });

    describe('initialize with fallback and custom middleware chain and binding', () => {
        const {on, chain, route} = router((req, res) => {
            send(res, 404, {ok: false});
        });

        const middlewares = [
            (next) => (req, res) => {
                res.data = [];

                next(req, res);
            },

            (next) => (req, res) => {
                res.data.push('foobar');

                next(req, res);
            },
        ];

        it('should respond 200 to GET:/custom', (done) => {
            on('get', '/custom', chain(middlewares)((req, res) => {
                send(res, 200, {data: res.data});
            }));

            request(route)
                .get('/custom')
                .expect('Content-Type', /json/)
                .expect({'data': ['foobar']})
                .expect(200, done)
            ;
        });
    });

    describe('register flat folder structure', () => {
        const {register, route} = router((req, res) => {
            send(res, 404);
        });

        (async () => {
            await register('./test/fixtures/plain');
        })();

        it('should respond 200 to GET:/', (done) => {
            request(route)
                .get('/')
                .expect('Content-Type', /json/)
                .expect({'ok': true})
                .expect(200, done)
            ;
        });

        it('should respond 404 of fallback', (done) => {
            request(route)
                .get('/foo')
                .expect(404, done)
            ;
        });
    });

    describe('register nested folder structure', () => {
        const {register, route} = router((req, res) => {
            send(res, 404);
        });

        (async () => {
            await register('./test/fixtures/nested');
        })();

        it('should return 404 from root of fallback', (done) => {
            request(route)
                .get('/foo')
                .expect(404, done)
            ;
        });

        it('should respond 200 to GET:/a', (done) => {
            request(route)
                .get('/a')
                .expect('Content-Type', /json/)
                .expect({'ok': true})
                .expect(200, done)
            ;
        });

        it('should respond 404 to GET:/b', (done) => {
            request(route)
                .get('/b')
                .expect(404, done)
            ;
        });

        it('should respond 200 to GET:/b/c', (done) => {
            request(route)
                .get('/a')
                .expect('Content-Type', /json/)
                .expect({'ok': true})
                .expect(200, done)
            ;
        });

        it('should respond 200 to POST:/b/c', (done) => {
            request(route)
                .get('/a')
                .expect('Content-Type', /json/)
                .expect({'ok': true})
                .expect(200, done)
            ;
        });
    });

    describe('register flat folder structure with middleware', () => {
        const {register, route} = router((req, res) => {
            send(res, 404);
        });

        (async () => {
            await register('./test/fixtures/middleware');
        })();

        it('should respond 200 to GET:/', (done) => {
            request(route)
                .get('/')
                .expect('Content-Type', /json/)
                .expect({'data': ['foo', 'bar']})
                .expect(200, done)
            ;
        });

        it('should respond 404 of fallback', (done) => {
            request(route)
                .get('/foo')
                .expect(404, done)
            ;
        });
    });

    describe('register flat folder structure with middleware and programmatic middleware', () => {
        const {use, register, route} = router((req, res) => {
            send(res, 404);
        });

        use((next) => (req, res) => {
            res.data = ['baz'];

            next(req, res);
        });

        (async () => {
            await register('./test/fixtures/middleware');
        })();

        it('should respond 200 to GET:/', (done) => {
            request(route)
                .get('/')
                .expect('Content-Type', /json/)
                .expect({'data': ['baz', 'bar']})
                .expect(200, done)
            ;
        });

        it('should respond 404 of fallback', (done) => {
            request(route)
                .get('/foo')
                .expect(404, done)
            ;
        });
    });

    describe('register nested folder structure with nested middlewares', () => {
        const {register, route} = router((req, res) => {
            send(res, 404);
        });

        (async () => {
            await register('./test/fixtures/nestedmiddleware');
        })();

        it('should respond 200 to GET:/', (done) => {
            request(route)
                .get('/')
                .expect('Content-Type', /json/)
                .expect({'data': ['a']})
                .expect(200, done)
            ;
        });

        it('should respond 404 to GET:/', (done) => {
            request(route)
                .get('/foo')
                .expect(404, done)
            ;
        });

        it('should respond 404 to GET:/a/b', (done) => {
            request(route)
                .get('/a/b')
                .expect(404, done)
            ;
        });

        it('should respond 404 to GET:/a/b/c', (done) => {
            request(route)
                .get('/a/b/c')
                .expect(404, done)
            ;
        });

        it('should respond 200 to GET:/a/b/c/d', (done) => {
            request(route)
                .get('/a/b/c/d')
                .expect('Content-Type', /json/)
                .expect({'data': ['a', 'c', 'd']})
                .expect(200, done)
            ;
        });

        it('should respond 200 to POST:/a/b', (done) => {
            request(route)
                .post('/a/b')
                .expect('Content-Type', /json/)
                .expect({'data': ['foobar']})
                .expect(200, done)
            ;
        });

        it('should respond 200 to GET:/w/x/y/z', (done) => {
            request(route)
                .get('/w/x/y/z')
                .expect('Content-Type', /json/)
                .expect({'data': ['a', 'y', 'z']})
                .expect(200, done)
            ;
        });

        it('should respond 200 to GET:/w/x/y/z/a/b/c/d', (done) => {
            request(route)
                .get('/w/x/y/z/a/b/c/d')
                .expect('Content-Type', /json/)
                .expect({'data': ['a', 'y', 'z', 'c', 'd']})
                .expect(200, done)
            ;
        });
    });
});

