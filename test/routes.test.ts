import assert from "assert";
import factory from "../src/routes";
import {Path} from "../src/types";

describe('routes', () => {

    /**
     *
     */
    const noop = () => {
    };

    /**
     *
     */
    const createNoop = () => {
        return () => {
        };
    };

    describe('set/get', () => {
        it('should set/get a handler', (done) => {
            const routes = factory();
            const path = '/foo' as Path;

            routes.set('GET', path, noop);

            const handler = routes.get('GET', path);

            assert(noop === handler, 'returned value differs from original');

            done();
        });

        it('should set/get a middleware', (done) => {
            const routes = factory();
            const path = '/foo' as Path;

            routes.set(null, path, noop);

            const middleware = routes.get(null, path);

            assert(noop === middleware, 'returned value differs from original');

            done();
        });
    });

    describe('reduce', () => {
        it('should return three middlewares', (done) => {
            const routes = factory();
            const steps = ['foo', 'bar', 'biz'];

            for (let i = 0; i < steps.length; i++) {
                const path = steps.slice(0, i + 1)
                    .join('/') as Path
                ;

                routes.set(null, path, createNoop());
            }

            for (let i = 0; i < steps.length; i++) {
                const path = steps.slice(0, i + 1)
                    .join('/') as Path
                ;

                const middlewares = routes.reduce(path);
                const unique = [...new Set(middlewares)];

                assert(middlewares.length === i + 1, 'middleware length differs from expectation');
                assert(unique.length === i + 1, 'middlewares are not unique');
            }

            done();
        });

        it('should use cache', (done) => {
            const routes = factory();
            const path = '/foo' as Path;

            const a = createNoop();
            const b = createNoop();

            // set and save to cache
            routes.set(null, path, a);
            let [middleware] = routes.reduce(path);
            assert(middleware === a, 'reduced middleware differs from expectation');
            assert(middleware !== b, 'reduced middleware differs from expectation');

            // retrieve from cache
            [middleware] = routes.reduce(path);
            assert(middleware === a, 'reduced middleware differs from expectation');

            // reset from
            routes.set(null, path, b);
            [middleware] = routes.reduce(path);
            assert(middleware === b, 'reduced middleware differs from expectation');

            done();
        });
    });

    describe('resolve', () => {
        it('should return id from url', (done) => {
            const routes = factory();
            const path = '/user/:id' as Path;
            routes.set('GET', path, noop);

            const resolved = routes.resolve('GET', '/user/123' as Path);

            assert(resolved['id'] === '123', 'resolved value differs from expectation');

            done();
        });

        it('should return id/name from GET:/user/123/joe', (done) => {
            const routes = factory();
            const path = '/user/:a/:b' as Path;
            routes.set('GET', path, noop);

            const resolved = routes.resolve('GET', '/user/123/joe' as Path);

            assert(resolved['a'] === '123', 'resolved value differs from expectation');
            assert(resolved['b'] === 'joe', 'resolved value differs from expectation');

            done();
        });

        it('should only return id from GET:/user/123', (done) => {
            const routes = factory();
            const path = '/user/:a/:b' as Path;
            routes.set('GET', path, noop);

            const resolved = routes.resolve('GET', '/user/123' as Path);

            assert(resolved['a'] === '123', 'returned value differs from expectation');
            assert(resolved['b'] === undefined, 'resolved value differs from expectation');

            done();
        });

        it('should not return anything', (done) => {
            const routes = factory();
            const path = '/user/:id' as Path;
            routes.set('GET', path, noop);

            const resolved = routes.resolve('GET', '/unknown/123' as Path);

            assert(Object.keys(resolved).length === 0, 'resolved values should be empty');

            done();
        });
    });
});
