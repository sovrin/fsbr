<h1 align="left">fsbr</h1>

[![npm version][npm-src]][npm-href]
[![types][types-src]][types-href]
[![size][size-src]][size-href]
[![coverage][coverage-src]][coverage-href]
[![License][license-src]][license-href]

> file structure based router for servers

## Installation
```bash
$ npm i fsbr
```

## Usage

### Native
```js
import router from 'fsbr';
import { createServer } from 'http';

const { use, register, route } = router();

// will be invoked on every request, before the route
use((req, res, next) => {
    // do middleware things
    return next();
});

register('./routes');

// will be invoked if no route was found
use((_req, res) => {
    res.statusCode = 404;
    res.end('Not Found');
});

use((req, res, next, error) => {
    // handle error
    return next(error);
});

const server = createServer(route);
server.listen(8080);
```

### Express
```js
import router from 'fsbr';
import express from 'express';

const app = express();
const { use, register, route } = router();

// will be invoked on every request, before the route
use((req, res, next) => {
    // do middleware things
    return next();
});

use((req, res, next, error) => {
    // handle error
    return next(error);
});

register('./routes');

// will be invoked if no route was found
use((_req, res) => {
    res.statusCode = 404;
    res.end('Not Found');
});

app.use(route);
app.listen(3000);
```

## API
- <a href="#ctor"><code><b>fsbr(config)</b></code></a>
- <a href="#routerOn"><code>router.<b>on()</b></code></a>
- <a href="#routerHas"><code>router.<b>has()</b></code></a>
- <a href="#routerUse"><code>router.<b>use()</b></code></a>
- <a href="#routerChain"><code>router.<b>chain()</b></code></a>
- <a href="#routerRoute"><code>router.<b>route()</b></code></a>
- <a href="#routerRegister"><code>router.<b>register()</b></code></a>

<a name="library"></a>
### Library

<a name="ctor"></a>
### `fsbr(config: Config)`
#### `Config`
|         | default | description                                |
|:--------|:--------|:-------------------------------------------|
| `ext`   | .js     | extension of middleware and handler files  |
| `entry` | index   | name of middleware files e.g. `middleware` |

Creates a new `fsbr` instance.
```javascript
import router from 'fsbr';

const {on, use, chain, register, route} = router();
```

***

<a name="routerOn"></a>
#### `router.on(method, path, handler)`
Registers a route. A Method can be any known [`HTTP method/verb`](https://developer.mozilla.org/de/docs/Web/HTTP/Methods) or a wildcard `*`.
Paths can contain a variable denoted via a colon. In this case, handlers receive a third optional argument with the resolved variable. Paths can also have a wildcard. `fsbr` will match every request after that. 

```javascript
const {on} = router();

// plain route
on('POST', '/post', (req, res) => {
    //
});

// route with id parameter
on('GET', '/user/:id', (req, res, params) => {
    const {id} = params;
});

// route with wildcard method
// any request with any HTTP method/verb on this route executes the handler
on('*', '/foo', (req, res) => {
    //
});

// route with wildcard in pathname
// any request with '/proxy/...' executes the handler
on('GET', '/proxy/*', (req, res) => {
    //
});
```

***

<a name="routerHas"></a>
#### `router.has(method, path)`
Returns true, if the route exists.
```javascript
const {has} = router();

has('POST', '/post');
```

***

<a name="routerUse"></a>
#### `router.use(middleware)`
Registers a middleware function to the router. Middlewares with 4 parameters are considered as error handlers.
Note the order. The error parameter here should be on the fourth place, unlike in other frameworks like express.
```javascript
const {use} = router();

// normal middleware
use('POST', '/post', (req , res, next) => {
    // do middleware things
    return next();
});

// middleware for errorhandling
// notice the fourth and last argument "error"
use('get', '/photos', (req, res, next, error) => {
    // handle error
    console.error(error);
    return next();
});
```

***

<a name="routerChain"></a>
#### `router.chain(...middlewares)`
Transforms an array of middleware functions into a single middleware function.
```javascript
const {chain, on} = router();

const middlewares = [
    (req, res, next) => {
        res.data = [];
        return next();
    },
    (req, res, next) => {
        res.data.push('foobar');
        return next();
    },
];

on('GET', '/custom', chain(...middlewares, (req, res) => {
    console.log(res.data); // ['foobar']
}));
```

***

<a name="routerRoute"></a>
#### `router.route(req, res)`
Handle the incoming requests.
```javascript
const {route} = router();

const server = createServer((req, res) => {
    route(req, res);
});
server.listen(8080);
```

***

<a name="routerRegister"></a>
#### `router.register(base, cb)`
Recursively register all routes within the `base` folder and call the optional callback when finished.
Each directory represents a part of the URL pathname.
Dynamic routes can be created by enclosing the directory name in square brackets e.g. `[id]`.
Handlers are named by [`HTTP methods/verbs`](https://developer.mozilla.org/de/docs/Web/HTTP/Methods) and export a default listening function.
Middlewares can be placed alongside the handlers as `index` files. These files can export a single middleware function or an array of functions.

```javascript
const {register} = router();

register(__dirname + '/routes', () => {
    console.log('done');
});

```
#### Example
Registering the following folder/file structure with default configuration:
```
routes
|
├───api
|       index.js
|       get.js
|
├───photo
|   |   index.js
│   │   get.js
│   │   post.js
│   │   delete.js
│   │
│   ├───[id]
│   │       get.js
│   │
│   └───vacation
|           index.js
│           get.js
│           post.js
│
└───user
        post.js
```
Would bind the following routes:
* `GET:` example.com/api
* `GET:` example.com/photo
* `POST:` example.com/photo
* `DELETE:` example.com/photo
* `GET:` example.com/photo/:id
* `GET:` example.com/photo/vacation
* `POST:` example.com/photo/vacation
* `POST:` example.com/user

A GET call to `/photo/vacation` would execute the following scripts in order: 
* `photo/index.js`
* `photo/vacation/index.js`
* `photo/vacation/get.js`

# Licence
MIT License, see [LICENSE](./LICENSE)

[npm-src]: https://badgen.net/npm/v/fsbr
[npm-href]: https://www.npmjs.com/package/fsbr
[size-src]: https://badgen.net/packagephobia/install/fsbr
[size-href]: https://badgen.net/packagephobia/install/fsbr
[types-src]: https://badgen.net/npm/types/fsbr
[types-href]: https://badgen.net/npm/types/fsbr
[coverage-src]: https://coveralls.io/repos/github/sovrin/fsbr/badge.svg?branch=master
[coverage-href]: https://coveralls.io/github/sovrin/fsbr?branch=master
[license-src]: https://badgen.net/github/license/sovrin/fsbr
[license-href]: LICENSE
