<h1 align="left">micro-r</h1>

[![npm version][npm-src]][npm-href]
[![types][types-src]][types-href]
[![size][size-src]][size-href]
[![coverage][coverage-src]][coverage-href]
[![Dependencies][dep-src]][dep-href]
[![devDependencies][devDep-src]][devDep-href]
[![License][license-src]][license-href]

> file structure based router for HTTP servers

## Installation
```bash
$ npm i micro-r
```

## Usage

### Native
```js
import router from 'micro-r';
import {createServer} from 'http';

const {use, register, route} = router();

use((req, res, next) => {
    //
    next();
});

register('./routes');

const server = createServer(route);
server.listen(8080);
```

### Express
```js
import router from 'micro-r';
import express from 'expess';

const app = express();
const {use, register, route} = router();

use((req, res, next) => {
    //
    next();
});
register('./routes');

app.use(route);
app.listen(3000);
```

## API
- <a href="#ctor"><code><b>microR(config)</b></code></a>
- <a href="#routerOn"><code>router.<b>on()</b></code></a>
- <a href="#routerHas"><code>router.<b>has()</b></code></a>
- <a href="#routerUse"><code>router.<b>use()</b></code></a>
- <a href="#routerChain"><code>router.<b>chain()</b></code></a>
- <a href="#routerRoute"><code>router.<b>route()</b></code></a>
- <a href="#routerRegister"><code>router.<b>register()</b></code></a>

<a name="library"></a>
### Library

<a name="ctor"></a>
### `microR(config: Config)`
#### `Config`
|         | default | description
| :------ | :------ | :----------
| `ext`   | .js     | extension of middleware/listener files
| `entry` | index   | name of middleware files e.g. `middleware`
| `dev`   | false   | print errors in default fallback handle

Creates a new `microR` instance.
```javascript
import router from 'micro-r';

const {on, use, chain, register, route} = router();
```

***

<a name="routerOn"></a>
#### `router.on(method, path, listener)`
Registers a route to the router. A Method can be any known [`HTTP method/verb`](https://developer.mozilla.org/de/docs/Web/HTTP/Methods) or a wildcard `*`.
Paths can contain a variable, denoted with a semicolon. In this case, listeners receive a third optional argument with the resolved variables. Paths can also have a wildcard. microR will match every request after that. 

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
// any request with any HTTP method/verb on this route executes the listener
on('*', '/foo', (req, res) => {
    //
});

// route with wildcard in pathname
// any request with '/proxy/...' executes the listener
on('GET', '/proxy/*', (req, res) => {
    //
});
```

***

<a name="routerHas"></a>
#### `router.has(method, path)`
Returns true, if the bound route exists.
```javascript
const {has} = router();

has('POST', '/post');
```

***

<a name="routerUse"></a>
#### `router.use(middleware)`
Registers a middleware function to the router. Middlewares with 4 parameters are considered as error listeners.
Note the order. The error parameter here should be on the fourth place, unlike in frameworks like express.
```javascript
const {use} = router();

// normal middleware
use('POST', '/post', (req , res, next) => {
    // do middleware things
    next();
});

// middleware for errorhandling
// notice the fourth and last argument "error"
use('get', '/photos', (req, res, next, error) => {
    // handle error
    console.error(error);
    next();
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
        next();
    },
    (req, res, next) => {
        res.data.push('foobar');
        next();
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
Each subdirectory represents a part of the URL pathname. Each subdirectory can have an `index` file exporting one or an array of middlewares.
Listeners are named by [`HTTP methods/verbs`](https://developer.mozilla.org/de/docs/Web/HTTP/Methods) and export a default listening function.
```javascript
const {has} = router();

has('POST', '/post');

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
* `GET:` example.com/photo/vacation
* `POST:` example.com/photo/vacation
* `POST:` example.com/user

A GET call to `/photo/vacation` would execute the following files: 
* `photo/index.js`
* `photo/vacation/index.js`
* `photo/vacation/get.js`

# Licence
MIT License, see [LICENSE](./LICENSE)

[npm-src]: https://badgen.net/npm/v/micro-r
[npm-href]: https://www.npmjs.com/package/micro-r
[size-src]: https://badgen.net/packagephobia/install/micro-r
[size-href]: https://badgen.net/packagephobia/install/micro-r
[types-src]: https://badgen.net/npm/types/micro-r
[types-href]: https://badgen.net/npm/types/micro-r
[coverage-src]: https://coveralls.io/repos/github/sovrin/micro-r/badge.svg?branch=master
[coverage-href]: https://coveralls.io/github/sovrin/micro-r?branch=master
[dep-src]: https://badgen.net/david/dep/sovrin/micro-r
[dep-href]: https://badgen.net/david/dep/sovrin/micro-r
[devDep-src]: https://badgen.net/david/dev/sovrin/micro-r
[devDep-href]: https://badgen.net/david/dev/sovrin/micro-r
[license-src]: https://badgen.net/github/license/sovrin/micro-r
[license-href]: LICENSE