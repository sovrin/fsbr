import assert from 'assert';
import factory from '../src/cache';
import type {Token} from '../src/types';
import {noop} from './utils';

describe('cache', () => {
    it('should set/get cached value', (done) => {
        const cache = factory();
        const key = ['cache', 'fn'] as Token[];
        const test = [noop];

        cache.set(key, test);

        assert(cache.get(key) === test, 'return value differs from original');

        done();
    });

    it('should not have value', (done) => {
        const cache = factory();
        const key = ['cache', 'fn'] as Token[];

        assert(!cache.has(key), 'returned value is not null');

        done();
    });

    it('should delete value', (done) => {
        const cache = factory();
        const key = ['cache', 'fn'] as Token[];

        assert(!cache.del(key), 'non-existing resource was deleted');
        cache.set(key, [noop]);
        assert(cache.del(key), 'delete was not successful');

        done();
    });

    it('should not store values indefinitely', () => {
        let len = 3;
        const cache = factory(len);
        const test = [noop];

        [...Array(len)].map((_, i) => {
            cache.set(['cache', 'fn', i.toString()] as Token[], test);
            assert(cache.get(['cache', 'fn', i.toString()] as Token[]) === test);
        });

        ++len;
        cache.set(['cache', 'fn', len.toString()] as Token[], test);
        assert(cache.get(['cache', 'fn', '0'] as Token[]) === undefined);
    });
});
