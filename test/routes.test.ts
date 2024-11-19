import assert from 'assert';
import factory from '../src/routes';
import {Path, Position} from '../src/types';

describe('routes', () => {
    const createNoop = () => {
        return () => {};
    };

    describe('set/get', () => {
        it('should set/get a listener', (done) => {
            const routes = factory();
            const path = '/foo' as Path;
            const noop = createNoop();

            routes.set('GET', path, noop);

            const [listener, position] = routes.get('GET', path);

            assert(listener === noop, 'returned value differs from original');
            assert(position === 1, 'returned value differs from original');

            done();
        });

        it('should set/get a listener via wildcard', (done) => {
            const routes = factory();
            const path = '/foo' as Path;
            const noop = createNoop();

            routes.set('*', path, noop);

            const [listener, position] = routes.get('GET', path);

            assert(listener === noop, 'returned value differs from original');
            assert(position === 1, 'returned value differs from original');

            done();
        });
    });

    describe('reduce', () => {
        it('should return three middlewares', (done) => {
            const routes = factory();
            const steps = ['foo', 'bar', 'biz'];

            for (let i = 0; i < steps.length; i++) {
                const path = steps.slice(0, i + 1)
                    .join('/') as Path;
                routes.set(null, path, createNoop());
            }

            for (let i = 0; i < steps.length; i++) {
                const path = steps.slice(0, i + 1)
                    .join('/') as Path;
                const middlewares = routes.reduce(path);
                const unique = [...new Set(middlewares)];

                assert(middlewares.length === i + 1, 'middleware length differs from expectation');
                assert(unique.length === i + 1, 'middlewares are not unique');
            }

            done();
        });

        it('should return middlewares from position 2', (done) => {
            const routes = factory();

            for (let i = 0; i < 5; i++) {
                routes.set(null, '/foo' as Path, createNoop());
            }

            const all = routes.reduce('/foo' as Path);
            const middlewares = routes.reduce('/foo' as Path, 3 as Position);
            const unique = [...new Set(middlewares)];

            assert(all.length === 5, 'middleware length differs from expectation');
            assert(middlewares.length === 2, 'middleware length differs from expectation');
            assert(unique.length === 2, 'middlewares are not unique');

            done();
        });

        it('should use cache', (done) => {
            const routes = factory();
            const path = '/foo' as Path;

            const a = createNoop();
            const b = createNoop();

            // set and save to cache
            routes.set(null, path, a);

            {
                const [middleware] = routes.reduce(path);
                assert(middleware === a, 'reduced middleware differs from expectation');
                assert(middleware !== b, 'reduced middleware differs from expectation');
            }

            {
                // retrieve from cache
                const [middleware] = routes.reduce(path);
                assert(middleware === a, 'reduced middleware differs from expectation');
            }

            {
                // retrieve multiple
                routes.set(null, path, b);
                const [middlewareA, middleWareB] = routes.reduce(path);
                assert(middlewareA === a, 'reduced middleware differs from expectation');
                assert(middleWareB === b, 'reduced middleware differs from expectation');
            }

            done();
        });
    });

    describe('resolve', () => {
        it('should return id from url', (done) => {
            const routes = factory();
            const path = '/user/:id' as Path;
            const noop = createNoop();

            routes.set('GET', path, noop);

            const resolved = routes.resolve('GET', '/user/123' as Path);

            assert(resolved['id'] === '123', 'resolved value differs from expectation');

            done();
        });

        it('should return id/name from GET:/user/123/joe', (done) => {
            const routes = factory();
            const path = '/user/:a/:b' as Path;
            const noop = createNoop();

            routes.set('GET', path, noop);

            const resolved = routes.resolve('GET', '/user/123/joe' as Path);

            assert(resolved['a'] === '123', 'resolved value differs from expectation');
            assert(resolved['b'] === 'joe', 'resolved value differs from expectation');

            done();
        });

        it('should only return id from GET:/user/123', (done) => {
            const routes = factory();
            const path = '/user/:a/:b' as Path;
            const noop = createNoop();

            routes.set('GET', path, noop);

            const resolved = routes.resolve('GET', '/user/123' as Path);

            assert(resolved['a'] === '123', 'returned value differs from expectation');
            assert(resolved['b'] === undefined, 'resolved value differs from expectation');

            done();
        });

        it('should not return anything', (done) => {
            const routes = factory();
            const path = '/user/:id' as Path;
            const noop = createNoop();

            routes.set('GET', path, noop);

            const resolved = routes.resolve('GET', '/unknown/123' as Path);

            assert(Object.keys(resolved).length === 0, 'resolved values should be empty');

            done();
        });
    });
});
