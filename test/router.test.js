const {send} = require('micro');
const {strictEqual} = require('assert');
const {default: router, Event} = require('../');
const request = require('supertest');

describe('micro-r', () => {
    describe('has route', () => {
        const {on, has} = router();
        on('get', '/has', () => {});

        it('should return true on existing route', (done) => {
            strictEqual(has('get', '/has'), true);

            done();
        });

        it('should return false on non-existing route', (done) => {
            strictEqual(has('get', '/not'), false);

            done();
        });
    });

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

        it('should respond 404 of fallback', (done) => {
            request(route)
                .get('/foo')
                .expect(404, done)
            ;
        });
    });

    describe('initialize with wildcard', () => {
        const {on, route} = router((req, res) => {
            send(res, 404);
        });

        on('*', '/custom', (req, res) => {
            send(res, 200);
        });

        it('should respond 200 to GET:/custom', (done) => {
            request(route)
                .get('/custom')
                .expect(200, done)
            ;
        });

        it('should respond 200 to POST:/custom', (done) => {
            request(route)
                .post('/custom')
                .expect(200, done)
            ;
        });

        it('should respond 200 to PUT:/custom', (done) => {
            request(route)
                .put('/custom')
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

        use((req, res, next) => {
            res.data = 123;

            next();
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

    describe('initialize with fallback and several middlewares', () => {
        const {on, use, route} = router((req, res) => {
            send(res, 404, {ok: false});
        });

        use((req, res, next) => {
            res.data = [];

            next();
        });

        use((req, res, next) => {
            res.data.push('foo');

            next();
        });

        it('should respond 200 to GET:/custom', (done) => {
            on('get', '/custom', (req, res) => {
                send(res, 200, {data: res.data});
            });

            request(route)
                .get('/custom')
                .expect('Content-Type', /json/)
                .expect({'data': ['foo']})
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
            (req, res, next) => {
                res.data = [];

                next();
            },

            (req, res, next) => {
                res.data.push('foobar');

                next();
            },
        ];

        it('should respond 200 to GET:/custom', (done) => {
            on('get', '/custom', chain(...middlewares, (req, res) => {
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

        let ready = false;

        before(done => {
            register('./test/fixtures/plain', done).then((value => ready = value));
        });

        it('should be ready', (done) => {
            strictEqual(ready, true);
            done();
        })

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

    describe('register multiple flat folder structures', () => {
        const {register, route} = router((req, res) => {
            send(res, 404);
        });

        before(done => {
            register('./test/fixtures/nested/a', () => {
                register('./test/fixtures/nested/b', done);
            });
        });

        it('should respond 200 to GET:/', (done) => {
            request(route)
                .get('/')
                .expect('Content-Type', /json/)
                .expect({'ok': true})
                .expect(200, done)
            ;
        });

        it('should respond 200 to GET:/c', (done) => {
            request(route)
                .get('/c')
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

        before(done => {
            register('./test/fixtures/nested', done);
        });

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

        before(done => {
            register('./test/fixtures/middleware', done);
        });

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

        before(done => {
            register('./test/fixtures/middleware', done);
        });

        use((req, res, next) => {
            res.data = ['baz'];

            next();
        });


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

        before(done => {
            register('./test/fixtures/nestedmiddleware', done);
        });

        it('should respond 200 to GET:/', (done) => {
            request(route)
                .get('/')
                .expect('Content-Type', /json/)
                .expect({'data': ['a1', 'a2']})
                .expect(200, done)
            ;
        });

        it('should respond 404 to GET:/foo', (done) => {
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
                .expect({'data': ['a1', 'a2', 'c', 'd']})
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
                .expect({'data': ['a1', 'a2', 'w', 'y', 'z']})
                .expect(200, done)
            ;
        });

        it('should respond 200 to GET:/w/x/y/z/a/b/c/d', (done) => {
            request(route)
                .get('/w/x/y/z/a/b/c/d')
                .expect('Content-Type', /json/)
                .expect({'data': ['a1', 'a2', 'w', 'y', 'z', 'c', 'd']})
                .expect(200, done)
            ;
        });
    });

    describe('listener', () => {
        const {listener, register, route} = router();
        let called = [];

        before(done => {
            register('./test/fixtures/listener', done);
        });

        listener.on(Event.READY, () => {
            called.push('ready');
        });

        it('should trigger listeners', (done) => {
            const off = listener.on(Event.ERROR, (req, res, {message}) => {
                send(res, 500, {message});

                called.push('error');
            });

            request(route)
                .get('/error')
                .expect('Content-Type', /json/)
                .expect({'message': 'trigger error listener'})
                .expect(500)
                .then(() => {

                    off();

                    strictEqual(called.length, 2, 'listeners should be called twice');
                    strictEqual(called[0], 'ready', 'ready should be called first');
                    strictEqual(called[1], 'error', 'error should be called second');

                    request(route)
                        .get('/error')
                        .expect(200, done)
                    ;
                })
            ;
        });
    });
});

