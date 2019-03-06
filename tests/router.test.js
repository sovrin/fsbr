const {send} = require('micro');
const test = require('tape');
const router = require('../lib/router');
const request = require('supertest');

test('micro-r', (tape) => {

    tape.test('initialize with fallback', (tape) => {
        const {on, route} = router((req, res) => {
            send(res, 404);
        });

        tape.test('should respond 200 to GET:/custom', (tape) => {
            on('get', '/custom', (req, res) => {
                send(res, 200);
            });

            request(route)
                .get('/custom')
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 200 to GET:/custom', (tape) => {
            on('get', '/custom', (req, res) => {
                send(res, 200);
            });

            request(route)
                .get('/custom')
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 404 of fallback', (tape) => {
            request(route)
                .get('/foo')
                .expect(404)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });
    });

    tape.test('initialize with fallback and middleware', (tape) => {
        const {on, use, route} = router((req, res) => {
            send(res, 404, {ok: false});
        });

        use((next) => (req, res) => {
            res.data = 123;

            next(req, res);
        });

        tape.test('should respond 200 to GET:/custom', (tape) => {
            on('get', '/custom', (req, res) => {
                send(res, 200, {data: res.data});
            });

            request(route)
                .get('/custom')
                .expect('Content-Type', /json/)
                .expect({'data': 123})
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 404 of fallback', (tape) => {
            request(route)
                .get('/foo')
                .expect('Content-Type', /json/)
                .expect({'ok': false})
                .expect(404)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });
    });

    tape.test('initialize with fallback and custom middleware chain and binding', (tape) => {
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

        tape.test('should respond 200 to GET:/custom', (tape) => {
            on('get', '/custom', chain(middlewares)((req, res) => {
                send(res, 200, {data: res.data});
            }));

            request(route)
                .get('/custom')
                .expect('Content-Type', /json/)
                .expect({'data': ['foobar']})
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });
    });

    tape.test('register flat folder structure', async (tape) => {
        const {register, route} = router((req, res) => {
            send(res, 404);
        });

        await register('./tests/fixtures/plain');

        tape.test('should respond 200 to GET:/', (tape) => {
            request(route)
                .get('/')
                .expect('Content-Type', /json/)
                .expect({'ok': true})
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 404 of fallback', (tape) => {
            request(route)
                .get('/foo')
                .expect(404)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });
    });

    tape.test('register nested folder structure', async (tape) => {
        const {register, route} = router((req, res) => {
            send(res, 404);
        });

        await register('./tests/fixtures/nested');

        tape.test('should return 404 from root of fallback', (tape) => {
            request(route)
                .get('/foo')
                .expect(404)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 200 to GET:/a', (tape) => {
            request(route)
                .get('/a')
                .expect('Content-Type', /json/)
                .expect({'ok': true})
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 404 to GET:/b', (tape) => {
            request(route)
                .get('/b')
                .expect(404)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 200 to GET:/b/c', (tape) => {
            request(route)
                .get('/a')
                .expect('Content-Type', /json/)
                .expect({'ok': true})
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 200 to POST:/b/c', (tape) => {
            request(route)
                .get('/a')
                .expect('Content-Type', /json/)
                .expect({'ok': true})
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });
    });

    tape.test('register flat folder structure with middleware', async (tape) => {
        const {use, register, route} = router((req, res) => {
            send(res, 404);
        });


        await register('./tests/fixtures/middleware');

        tape.test('should respond 200 to GET:/', (tape) => {
            request(route)
                .get('/')
                .expect('Content-Type', /json/)
                .expect({'data': ['foo', 'bar']})
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 404 of fallback', (tape) => {
            request(route)
                .get('/foo')
                .expect(404)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });
    });

    tape.test('register flat folder structure with middleware and programmatic middleware', async (tape) => {
        const {use, register, route} = router((req, res) => {
            send(res, 404);
        });

        use((next) => (req, res) => {
            res.data = ['baz'];

            next(req, res);
        });

        await register('./tests/fixtures/middleware');

        tape.test('should respond 200 to GET:/', (tape) => {
            request(route)
                .get('/')
                .expect('Content-Type', /json/)
                .expect({'data': ['baz', 'bar']})
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 404 of fallback', (tape) => {
            request(route)
                .get('/foo')
                .expect(404)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });
    });

    tape.test('register nested folder structure with nested middlewares', async (tape) => {
        const {register, route} = router((req, res) => {
            send(res, 404);
        });

        await register('./tests/fixtures/nestedmiddleware');

        tape.test('should respond 200 to GET:/', (tape) => {
            request(route)
                .get('/')
                .expect('Content-Type', /json/)
                .expect({'data': ['a']})
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 404 to GET:/', (tape) => {
            request(route)
                .get('/foo')
                .expect(404)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 404 to GET:/a/b', (tape) => {
            request(route)
                .get('/a/b')
                .expect(404)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 404 to GET:/a/b/c', (tape) => {
            request(route)
                .get('/a/b/c')
                .expect(404)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 404 to GET:/a/b/c/d', (tape) => {
            request(route)
                .get('/a/b/c/d')
                .expect('Content-Type', /json/)
                .expect({'data': ['a', 'c', 'd']})
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 404 to POST:/a/b', (tape) => {
            request(route)
                .post('/a/b')
                .expect('Content-Type', /json/)
                .expect({'data': ['foobar']})
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 404 to GET:/w/x/y/z', (tape) => {
            request(route)
                .get('/w/x/y/z')
                .expect('Content-Type', /json/)
                .expect({'data': ['a', 'y', 'z']})
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });

        tape.test('should respond 404 to GET:/w/x/y/z/a/b/c/d', (tape) => {
            request(route)
                .get('/w/x/y/z/a/b/c/d')
                .expect('Content-Type', /json/)
                .expect({'data': ['a', 'y', 'z', 'c', 'd']})
                .expect(200)
                .end((err) => {
                    tape.error(err);
                    tape.end();
                })
            ;
        });
    });

    tape.end();
});

