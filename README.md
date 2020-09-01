<h1 align="left">micro-r</h1>

[![npm version][npm-src]][npm-href]
[![types][types-src]][types-href]
[![size][size-src]][size-href]
[![Dependencies][dep-src]][dep-href]
[![devDependencies][devDep-src]][devDep-href]
[![License][license-src]][license-href]

file structure based router for micro/express

***
# Installation

```bash
$ npm i micro-r
```

# About
micro-r is a small and opinionated routing library utilizing file/folder of the application.
Routes are not dynamic and are bound at runtime, rendering "Directory Traversal Attacks" not applicable.

Middlewares can be defined by use() or by dropping index.js files in the desired folders. These must export either a plain middleware function or an array of functions.

# Functions
## configure(object)
Provides the possibility to change the following defaults.
* `ext: string` extension of middleware files e.g.`.ts`; default: `.js`
* `entry: string` name of middleware files e.g.`middleware`; default: `index`

## on(method, path, handler)
Register custom handlers to specific paths.
* `method: string` one of: `*, get, post, put, patch, delete, head, options`
* `path: string` pathname to match
* `handler: Function` callback function receiving req and res as parameters

## use(middleware)
Register a middleware function.
* `middleware: Function` e.g.`(req, res, next) => next()`

## has(method, path)
Returns true of the requested route exists.
* `method: string` one of: `*, get, post, put, patch, delete, head, options`
* `path: string` pathname

## chain(middlewares)
Transforms an array of middleware functions into a single middleware function.
* `middlewares: Array<Function>` similar to use() but with arrays

## register(basepath, onDone)
Recursively register the given path and its subfolders.
* `basepath: string` path to folder
* `onDone: Function` optional; called if registration done

## route(req, res)
Handle the incoming requests.
* `req: IncomingMessage` server request object
* `res: ServerResponse` server response object

## listener
`listener` Instance exposes three functions to bind, unbind and emit events.

### Events
Following `Events` are available:
* `Ready` if micro-r is done with `register()`
* `Error` if an uncatched error in middleware, route or `register` call occurred 

### on(event, handler)
Register an event handler.
* `event: string` name of the event
* `handler: function` event handler

### off(event, handler)
Unregister an event handler.
* `event: string` name of the event
* `handler: function` event handler

### emit(event, req, res, payload)
Emit an event with payload.
* `event: string` name of the event
* `req: IncomingMessage` server request object
* `res: ServerResponse` server response object
* `payload: any` any kind of data

# Example
Following folder/file structure with default configuration
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
registers the following routes
* `GET:` example.com/api
* `GET:` example.com/photo
* `POST:` example.com/photo
* `DELETE:` example.com/photo
* `GET:` example.com/photo/vacation
* `POST:` example.com/photo/vacation
* `POST:` example.com/user

## Vanilla
```JavaScript
const {default: router, Event} = require('micro-r');
const {send} = require('micro');

const fallback = (req, res) => {
    send(res, '404', 'WOOPS');
};

const {on, use, chain, register, route, listener} = router(fallback);

listener.on(Event.READY, () => console.info('I\'m ready'));
listener.on(Event.ERROR, (req, res, error) => console.error(req, res, error));

register('./routes');

on('get', '/foo', async (req, res) => {
    send(res, 200);
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
 
on('get', '/custom', chain(middlewares)(async (req, res) => {
    // res.data === ['foobar']
    send(res, 200);
}));

module.exports = route;
```
## Express
```JavaScript
const {default: router, Event} = require('micro-r');
const express = require('express');

const app = express();

const fallback = (req, res) => {
    send(res, '404', 'WOOPS');
};

const {register, route, listener} = router(fallback);

register('./routes', () => console.info('I\'m ready'));

app.use(route);
app.listen(3000);
```

# Licence
MIT License

Copyright (c) 2019 Oleg Kamlowski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


[npm-src]: https://badgen.net/npm/v/micro-r
[npm-href]: https://www.npmjs.com/package/micro-r
[size-src]: https://badgen.net/packagephobia/install/micro-r
[size-href]: https://badgen.net/packagephobia/install/micro-r
[types-src]: https://badgen.net/npm/types/micro-r
[types-href]: https://badgen.net/npm/types/micro-r
[dep-src]: https://badgen.net/david/dep/sovrin/micro-r
[dep-href]: https://badgen.net/david/dep/sovrin/micro-r
[devDep-src]: https://badgen.net/david/dev/sovrin/micro-r
[devDep-href]: https://badgen.net/david/dev/sovrin/micro-r
[license-src]: https://badgen.net/github/license/sovrin/micro-r
[license-href]: LICENSE