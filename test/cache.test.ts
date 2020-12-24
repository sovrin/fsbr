import assert from "assert";
import factory from "../src/cache";

describe('cache', () => {

    /**
     *
     */
    const noop = () => {
    };

    it('should set/get cached value', (done) => {
        const cache = factory();
        const key = ['cache', 'fn'];

        cache.set(key, noop);

        assert(cache.get(key) === noop, 'return value differs from original');

        done();
    });

    it('should not have value', (done) => {
        const cache = factory();
        const key = ['cache', 'fn'];

        assert(!cache.has(key), 'returned value is not null');

        done();
    });

    it('should delete value', (done) => {
        const cache = factory();
        const key = ['cache', 'fn'];

        assert(!cache.del(key), 'non-existing resource was deleted');
        cache.set(key, noop);
        assert(cache.del(key), 'delete was not successful');

        done();
    });
});
