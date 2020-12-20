import {send} from "micro";
import {strictEqual} from "assert";
import router, {Event} from "../src";
import request from "supertest";

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

    describe('test configure', () => {
        const {configure} = router();

        it('should set and return config value', (done) => {
            let entry = configure('entry');
            let ext = configure('ext');

            strictEqual(entry, 'index', 'entry is default value');
            strictEqual(ext, '.js', 'extension is default value');

            configure({
                entry: 'foo',
                ext: 'bar',
            })

            entry = configure('entry');
            ext = configure('ext');

            strictEqual(entry, 'foo', 'entry is modified value');
            strictEqual(ext, 'bar', 'extension is modified value');

            done();
        });
    });

    describe('initialize with fallback', () => {
        const {on, route, use} = router((req, res) => {
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

        it('should only be called twice', (done) => {
            let count = 0;

            use((req, res, next) => {
                // @ts-ignore
                res.count = ++count;

                next();
            });

            request(route)
                .get('/foo')
                .end(() => {
                    request(route)
                        .get('/foo')
                        .expect((res) => {
                            strictEqual(count, 2);
                        })
                        .end(done)
                    ;
                })
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
            // @ts-ignore
            res.data = 123;

            next();
        });

        it('should respond 200 to GET:/custom', (done) => {
            on('get', '/custom', (req, res) => {
                // @ts-ignore
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
            // @ts-ignore
            res.data = [];

            next();
        });

        use((req, res, next) => {
            // @ts-ignore
            res.data.push('foo');

            next();
        });

        it('should respond 200 to GET:/custom', (done) => {
            on('get', '/custom', (req, res) => {
                // @ts-ignore
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
                // @ts-ignore
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

    describe('register non-existing folder', () => {
        const {register, route, listener} = router((req, res) => {
            send(res, 404);
        });

        let threwError = false;

        before(done => {
            listener.on(Event.ERROR, () => {
                threwError = true;
            });

            register('./test/yeet', done);
        });

        it('should execute fallback', (done) => {
            request(route)
                .get('/yeet')
                .expect(404)
                .then(() => {
                    strictEqual(threwError, true, 'folder was not found and an error was thrown');

                    done();
                })
            ;
        })
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

        it('should respond 200 to GET:/c/', (done) => {
            request(route)
                .get('/c/')
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
            // @ts-ignore
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

    describe('listener and error handler', () => {
        const {listener, register, use, route} = router();
        const called = [];

        before(done => {
            listener.on(Event.READY, () => {
                called.push('ready');
            });

            use(() => {
                throw new Error('middleware throw error');
            });

            register('./test/fixtures/listener', done);
        });

        it('should trigger the middleware error, falling into the fallback routine', (done) => {
            request(route)
                .get('/error')
                .expect(500, done)
            ;
        });

        it('should bind and unbind listener', (done) => {
            const off = listener.on(Event.ERROR, (req, res, {message}) => {
                send(res, 500, {message});
            });

            strictEqual(off(), true, 'listener was removed');
            strictEqual(off(), false, 'listener already removed');
            done();
        });

        it('should trigger listeners', (done) => {
            listener.on(Event.ERROR, (req, res, {message}) => {
                called.push(message);
            });

            request(route)
                .get('/error')
                .expect(500)
                .then(() => {
                    strictEqual(called.length, 3, 'listeners should be called trice');
                    strictEqual(called[0], 'ready', 'ready should be called first');
                    strictEqual(called[1], 'middleware throw error', 'middleware error should be called second');
                    strictEqual(called[2], 'trigger error listener', 'route error should be called third');

                    done();
                })
            ;
        });
    });
});

