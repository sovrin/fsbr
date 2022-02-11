import {send} from "micro";
import request from "supertest";
import assert from "assert";
import router from "../src";

describe('fsbr', () => {
    /**
     *
     */
    const noop = () => {
    };

    describe('has', () => {
        const {on, has} = router();
        on('GET', '/has', noop);

        it('should return true on known route', (done) => {
            const actual = has('GET', '/has');

            assert(actual, 'returned value should be true');
            done();
        });

        it('should return false on unknown route', (done) => {
            const actual = has('GET', '/not');

            assert(!actual, 'returned value should be false');
            done();
        });
    });

    describe('on/route', () => {
        describe('fallback', () => {
            const {route} = router();

            it('should respond with fallback to GET:/unknown', (done) => {
                request(route)
                    .get('/unknown')
                    .expect(500, done)
                ;
            });
        });

        describe('wildcard url', () => {
            const {on, route} = router();

            on('GET', '/api/user/*', (req, res) => {
                send(res, 200);
            });

            it('should pass through with 200 to GET:/api/user/a/b/c/d', (done) => {
                request(route)
                    .get('/api/user/a/b/c/d')
                    .expect(200, done)
                ;
            });

            it('should respond with 500 from fallback to GET:/api/user', (done) => {
                request(route)
                    .get('/api/user')
                    .expect(500, done)
                ;
            });
        });

        describe('wildcard url and url variable', () => {
            const {on, route} = router();

            on('GET', '/api/:user/*', (req, res, param) => {
                send(res, 200, param);
            });

            it('should pass through with 200 to GET:/api/user/a/b/c/d with match', (done) => {
                request(route)
                    .get('/api/joe/a/b/c/d')
                    .expect('Content-Type', /json/)
                    .expect({'user': 'joe'})
                    .expect(200, done)
                ;
            });

            it('should respond with 500 from fallback to GET:/api/joe', (done) => {
                request(route)
                    .get('/api/joe')
                    .expect(500, done)
                ;
            });
        });

        describe('wildcard method', () => {
            const {on, route} = router();

            on('*', '/custom', (req, res) => {
                send(res, 200);
            });

            it('should respond with 200 to GET:/custom', (done) => {
                request(route)
                    .get('/custom')
                    .expect(200, done)
                ;
            });

            it('should respond with 200 to POST:/custom', (done) => {
                request(route)
                    .post('/custom')
                    .expect(200, done)
                ;
            });

            it('should respond with 200 to PUT:/custom', (done) => {
                request(route)
                    .put('/custom')
                    .expect(200, done)
                ;
            });
        });

        describe('url variable', () => {
            const {on, route} = router();

            on('GET', '/user/:id', (req, res, match: any) => {
                send(res, 200, match);
            });

            it('should respond 200 to GET:/user/123 with match', (done) => {
                request(route)
                    .get('/user/123')
                    .expect('Content-Type', /json/)
                    .expect({'id': '123'})
                    .expect(200, done)
                ;
            });
        });

        describe('malformed urls', () => {
            const {on, route} = router();

            on('GET', '/custom', (req, res) => {
                send(res, 200);
            });

            it('should respond with 500 from fallback to GET:/:id/:id...', (done) => {
                request(route)
                    .get('/:id'.repeat(100))
                    .expect(500, done)
                ;
            });

            it('should respond with 500 from fallback to GET:/:id/custom/:id...', (done) => {
                request(route)
                    .get('/:id/custom'.repeat(100))
                    .expect(500, done)
                ;
            });
        });
    });

    describe('on/route/chain', () => {
        const {on, chain, route} = router();

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

        on('GET', '/custom', chain(...middlewares, (req, res) => {
            // @ts-ignore
            send(res, 200, {data: res.data});
        }));

        it('should respond to 200 to GET:/custom', (done) => {
            request(route)
                .get('/custom')
                .expect('Content-Type', /json/)
                .expect({'data': ['foobar']})
                .expect(200, done)
            ;
        });
    });

    describe('on/route/use', () => {
        describe('usages are order dependent', () => {
            it('should not execute any middleware', (done) => {
                const {on, route} = router();

                on('GET', '/custom', (req, res) => {
                    // @ts-ignore
                    send(res, 200, {data: res.data || false});
                });

                request(route)
                    .get('/custom')
                    .expect('Content-Type', /json/)
                    .expect({'data': false})
                    .expect(200, done)
                ;
            });

            describe('later bound middlewares are ignored', () => {
                const {on, use, route} = router();

                use((req, res, next) => {
                    // @ts-ignore
                    res.data = "foo";

                    next();
                });

                on('GET', '/custom', (req, res) => {
                    // @ts-ignore
                    send(res, 200, {data: res.data || false});
                });

                use((req, res, next) => {
                    // @ts-ignore
                    res.data = "bar";

                    next();
                });

                it('should not execute any middleware', (done) => {
                    request(route)
                        .get('/custom')
                        .expect('Content-Type', /json/)
                        .expect({'data': "foo"})
                        .expect(200, done)
                    ;
                });
            });
        });

        describe('use middleware', () => {
            const {on, use, route} = router();
            let callCount = 0;

            use((req, res, next) => {
                // @ts-ignore
                res.data = 123;
                // @ts-ignore
                res.count = ++callCount;

                next();
            });

            on('GET', '/custom', (req, res) => {
                // @ts-ignore
                send(res, 200, {data: res.data, calls: callCount});
            });

            it('should respond with 200 to GET:/custom with data of middleware', (done) => {
                callCount = 0;

                request(route)
                    .get('/custom')
                    .expect('Content-Type', /json/)
                    .expect({'data': 123, 'calls': 1})
                    .expect(200, done)
                ;
            });

            it('should respond with fallback with data of middleware', (done) => {
                callCount = 0;

                request(route)
                    .get('/foo')
                    .expect(500, done)
                ;
            });

            it('should respond with 200 to GET:/custom with data of middleware (consecutive call)', (done) => {
                request(route)
                    .get('/custom')
                    .expect(200, done)
                ;
            });

            it('should only be called twice', (done) => {
                callCount = 0;

                request(route)
                    .get('/foo')
                    .end(() => {
                        request(route)
                            .get('/foo')
                            .expect(() => {
                                assert(callCount === 2, 'middleware call count differs from expectation');
                            })
                            .end(done)
                        ;
                    })
                ;
            });
        });

        describe('use error middleware', () => {
            describe('by throw Error and no error middleware', () => {
                const {use, route} = router({dev: true});

                use(() => {
                    throw new Error('throw new whoops');
                });

                use((req, res, next) => {
                    // @ts-ignore
                    next(res.error.message);
                });

                it('should respond with 500 to GET:/custom with final middleware', (done) => {
                    request(route)
                        .get('/custom')
                        .expect('Content-Type', /json/)
                        .expect(/throw new whoops/)
                        .expect(500, done)
                    ;
                });
            });

            describe('by throw Error and error middleware', () => {
                const {use, route} = router({dev: true});

                use(() => {
                    throw new Error('throw new whoops');
                });

                use((req, res, next, error) => {
                    // @ts-ignore
                    res.error = error.message;

                    next(error);
                });

                it('should respond with 500 to GET:/custom with final middleware', (done) => {
                    request(route)
                        .get('/custom')
                        .expect('Content-Type', /json/)
                        .expect(/throw new whoops/)
                        .expect(500, done)
                    ;
                });
            });

            describe('by passing error', () => {
                const {on, use, route} = router({dev: true});
                let hits = 0;

                use((req, res, next) => {
                    hits += 1;
                    next('whoops');
                });

                use((req, res, next, error) => {
                    hits += 1;
                    next(error);
                });

                use((req, res, next) => {
                    hits += 1;
                    next();
                });

                on('GET', '/custom', (req, res) => {
                    hits += 1;
                    send(res, 200);
                });

                it('should respond with 500 to GET:/custom from final middleware and never reach listener', (done) => {
                    request(route)
                        .get('/custom')
                        .expect('Content-Type', /json/)
                        .expect('"whoops"')
                        .expect(500, (response) => {
                            assert(hits === 2);

                            done(response);
                        })
                    ;
                });
            });
        });

        describe('use several middlewares', () => {
            const {on, use, route} = router();
            let callCount = 0;

            use((req, res, next) => {
                // @ts-ignore
                res.data = [];

                // @ts-ignore
                res.count = ++callCount;

                next();
            });

            use((req, res, next) => {
                // @ts-ignore
                res.data.push('foo');

                // @ts-ignore
                res.count = ++callCount;

                next();
            });

            on('GET', '/custom', (req, res) => {
                // @ts-ignore
                send(res, 200, {data: res.data, calls: callCount});
            });

            it('should respond with 200 to GET:/custom with data of middleware', (done) => {
                callCount = 0;

                request(route)
                    .get('/custom')
                    .expect('Content-Type', /json/)
                    .expect({'data': ['foo'], calls: 2})
                    .expect(200, done)
                ;
            });

            it('should fallback with data of middleware', (done) => {
                callCount = 0;

                request(route)
                    .get('/foo')
                    .expect(500, done)
                ;
            });

            it('should only be called four times', (done) => {
                callCount = 0;

                request(route)
                    .get('/foo')
                    .end(() => {
                        request(route)
                            .get('/foo')
                            .expect(() => {
                                assert(callCount === 4, 'middleware call count differs from expectation');
                            })
                            .end(done)
                        ;
                    })
                ;
            });
        });

        describe('trigger final handler twice', () => {
            const {on, route, use} = router();

            use((req, res, next, error) => {
                send(res, 500);

                next();
            });

            on('GET', '/custom', () => {
                throw new Error();
            });

            it('should respond with 500 from fallback to GET:/:id/:id...', (done) => {
                request(route)
                    .get('/custom')
                    .expect(500, done)
                ;
            });
        })
    });

    describe('register', () => {
        it('should call callback on done', (done) => {
            const {register} = router();

            register('./test/fixtures/plain', done);
        });

        describe('not-existing folder', () => {
            const {register} = router();

            it('should not be able to register', (done) => {
                assert.throws(() => register('./test/yeet'), {
                    message: /ENOENT/,
                }, 'should not be able to register to not existing folder');

                done();
            });
        });

        describe('flat folder structure - fixtures/plain', () => {
            const {register, route} = router();

            register('./test/fixtures/plain');

            it('should respond with 200 to GET:/', (done) => {
                request(route)
                    .get('/')
                    .expect('Content-Type', /json/)
                    .expect({'ok': true})
                    .expect(200, done)
                ;
            });

            it('should respond with fallback to unknown route', (done) => {
                request(route)
                    .get('/foo')
                    .expect(500, done)
                ;
            });
        });

        describe('dynamic url parameter folder structure - fixtures/dynamic', () => {
            const {register, route} = router();

            register('./test/fixtures/dynamic');

            it('should respond with 200 to GET:/', (done) => {
                request(route)
                    .get('/')
                    .expect('Content-Type', /json/)
                    .expect({'ok': true})
                    .expect(200, done)
                ;
            });

            it('should respond with 200 to GET:/user/123', (done) => {
                request(route)
                    .get('/user/123')
                    .expect('Content-Type', /json/)
                    .expect({'id': '123'})
                    .expect(200, done)
                ;
            });

            it('should respond with fallback to unknown route GET:/foo', (done) => {
                request(route)
                    .get('/foo')
                    .expect(500, done)
                ;
            });

            it('should respond with fallback to unknown route GET:/user/foo/bar', (done) => {
                request(route)
                    .get('/user/foo/bar')
                    .expect(500, done)
                ;
            });
        });

        describe('nested folder structure - fixtures/nested', () => {
            const {register, route} = router();

            register('./test/fixtures/nested');

            it('should with respond 200 to GET:/a', (done) => {
                request(route)
                    .get('/a')
                    .expect('Content-Type', /json/)
                    .expect({'ok': true})
                    .expect(200, done)
                ;
            });

            it('should with respond with fallback to GET:/b', (done) => {
                request(route)
                    .get('/b')
                    .expect(500, done)
                ;
            });

            it('should with respond with fallback to GET:/b/c', (done) => {
                request(route)
                    .get('/a')
                    .expect('Content-Type', /json/)
                    .expect({'ok': true})
                    .expect(200, done)
                ;
            });

            it('should with respond 200 to POST:/b/c', (done) => {
                request(route)
                    .get('/a')
                    .expect('Content-Type', /json/)
                    .expect({'ok': true})
                    .expect(200, done)
                ;
            });

            it('should respond with fallback to unknown route GET:/foo', (done) => {
                request(route)
                    .get('/foo')
                    .expect(500, done)
                ;
            });
        });

        describe('multiple flat folder structures - fixtures/nested/[a|b]', () => {
            const {register, route} = router();

            register('./test/fixtures/nested/a');
            register('./test/fixtures/nested/b');

            it('should respond with 200 to GET:/', (done) => {
                request(route)
                    .get('/')
                    .expect('Content-Type', /json/)
                    .expect({'ok': true})
                    .expect(200, done)
                ;
            });

            it('should respond with 200 to GET:/c', (done) => {
                request(route)
                    .get('/c')
                    .expect('Content-Type', /json/)
                    .expect({'ok': true})
                    .expect(200, done)
                ;
            });

            it('should respond with 200 to GET:/c/', (done) => {
                request(route)
                    .get('/c/')
                    .expect('Content-Type', /json/)
                    .expect({'ok': true})
                    .expect(200, done)
                ;
            });

            it('should respond with fallback to unknown route GET:/foo', (done) => {
                request(route)
                    .get('/foo')
                    .expect(500, done)
                ;
            });
        });

        describe('flat folder structure with middleware - fixtures/middleware', () => {
            const {register, route} = router();

            register('./test/fixtures/middleware');

            it('should respond with 200 to GET:/', (done) => {
                request(route)
                    .get('/')
                    .expect('Content-Type', /json/)
                    .expect({'data': ['foo', 'bar']})
                    .expect(200, done)
                ;
            });

            it('should respond with fallback to unknown route GET:/foo', (done) => {
                request(route)
                    .get('/foo')
                    .expect(500, done)
                ;
            });
        });

        describe('flat folder structure with mixed middlewares - fixtures/middleware', () => {
            const {use, register, route} = router();

            use((req, res, next) => {
                // @ts-ignore
                res.data = ['baz'];

                next();
            });

            register('./test/fixtures/middleware');

            it('should respond with 200 to GET:/', (done) => {
                request(route)
                    .get('/')
                    .expect('Content-Type', /json/)
                    .expect({'data': ['baz', 'bar']})
                    .expect(200, done)
                ;
            });

            it('should respond with fallback to unknown route GET:/foo', (done) => {
                request(route)
                    .get('/foo')
                    .expect(500, done)
                ;
            });
        });

        describe('middlewares only folder structure - fixtures/onlymiddlewares', () => {
            describe('with wildcard route', () => {
                const {register, on, route} = router();

                on('GET', '/proxy/*', (req, res) => {
                    // @ts-ignore
                    send(res, 200, {data: res.data});
                });

                register('./test/fixtures/onlymiddlewares');

                it('should respond with 200 to GET:/', (done) => {
                    request(route)
                        .get('/proxy/user')
                        .expect('Content-Type', /json/)
                        .expect({'data': ['foo']})
                        .expect(200, done)
                    ;
                });
            });

            describe('without wildcard route', () => {
                const {register, route} = router();

                register('./test/fixtures/onlymiddlewares');

                it('should respond with fallback to listener-less route GET:/proxy/user', (done) => {
                    request(route)
                        .get('/proxy/user')
                        .expect(500, done)
                    ;
                });
            });
        });

        describe('nested middleware folder structure with nested middlewares - fixtures/nestedmiddlewares', () => {
            const {register, route} = router();

            register('./test/fixtures/nestedmiddlewares');

            it('should respond with 200 to GET:/', (done) => {
                request(route)
                    .get('/')
                    .expect('Content-Type', /json/)
                    .expect({'data': ['a1', 'a2']})
                    .expect(200, done)
                ;
            });

            it('should respond with fallback to GET:/a/b', (done) => {
                request(route)
                    .get('/a/b')
                    .expect(500, done)
                ;
            });

            it('should respond with fallback to GET:/a/b/c', (done) => {
                request(route)
                    .get('/a/b/c')
                    .expect(500, done)
                ;
            });

            it('should respond with 200 to GET:/a/b/c/d', (done) => {
                request(route)
                    .get('/a/b/c/d')
                    .expect('Content-Type', /json/)
                    .expect({'data': ['a1', 'a2', 'c', 'd']})
                    .expect(200, done)
                ;
            });

            it('should respond with 200 to POST:/a/b', (done) => {
                request(route)
                    .post('/a/b')
                    .expect('Content-Type', /json/)
                    .expect({'data': ['foobar']})
                    .expect(200, done)
                ;
            });

            it('should respond with 200 to GET:/w/x/y/z', (done) => {
                request(route)
                    .get('/w/x/y/z')
                    .expect('Content-Type', /json/)
                    .expect({'data': ['a1', 'a2', 'w', 'y', 'z']})
                    .expect(200, done)
                ;
            });

            it('should respond with 200 to GET:/w/x/y/z/a/b/c/d', (done) => {
                request(route)
                    .get('/w/x/y/z/a/b/c/d')
                    .expect('Content-Type', /json/)
                    .expect({'data': ['a1', 'a2', 'w', 'y', 'z', 'c', 'd']})
                    .expect(200, done)
                ;
            });

            it('should respond with 404 fallback to unknown route GET:/foo', (done) => {
                request(route)
                    .get('/foo')
                    .expect(500, done)
                ;
            });
        });

        describe('error handling in middleware - fixtures/errorhandling', () => {
            describe('inside handler', () => {
                const errors = [];
                const {register, route, use} = router();

                use((req, res, next, error) => {
                    errors.push(error);

                    next(error);
                });

                use((req, res, next, error) => {
                    errors.push(error);

                    next(error);
                });

                use((req, res, next) => {
                    next();
                })

                register('./test/fixtures/errorhandling');

                it('should trigger nested middleware error, falling into the fallback routine', (done) => {
                    request(route)
                        .get('/error')
                        .expect(500, (response) => {
                            const [error] = errors;

                            assert(errors.length === 2, 'only one error should be thrown');
                            assert(error.message === "handler throw error", 'thrown error differs from expectation');

                            done(response);
                        })
                    ;
                });
            });

            describe('inside middleware', () => {
                const errors = [];
                const {register, use, route} = router();

                use(() => {
                    throw new Error('middleware throw error');
                });

                use(() => {
                    throw new Error('middleware throw error');
                });

                use((req, res, next, error) => {
                    errors.push(error);

                    next();
                });

                register('./test/fixtures/errorhandling');

                it('should trigger nested middleware error, falling into the fallback routine', (done) => {
                    request(route)
                        .get('/error')
                        .expect(500, (response) => {
                            const [error] = errors;

                            assert(errors.length === 1, 'only two errors should be thrown');
                            assert(error.message === 'middleware throw error', 'thrown error differs from expectation');
                            done(response);
                        })
                    ;
                });
            });
        });

        describe('typescript support - fixtures/typescript', () => {
            const {route, register} = router({ext: '.ts'});

            register('./test/fixtures/typescript');

            it('should respond with 200 to GET:/a', (done) => {
                request(route)
                    .get('/a')
                    .expect('Content-Type', /json/)
                    .expect(['foo'])
                    .expect(200, done)
                ;
            });
        });
    });
});
