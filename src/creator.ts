import routes from './routes';
import cache from './cache';
import {final} from './middlewares';

type FactoryTypes = typeof factories;
type Keys = keyof FactoryTypes;
type Factory<K extends Keys> = FactoryTypes[K];

const factories = {
    cache,
    routes,
    final,
};

const factory = <K extends Keys>(k: K): Factory<K> => (
    factories[k]
);

/**
 * User: Oleg Kamlowski <oleg.kamlowski@thomann.de>
 * Date: 29.01.2022
 * Time: 18:01
 */
export default factory;
