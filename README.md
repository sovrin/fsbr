<h1 align="left">micro-r</h1>

file structure based router for micro/express

***
# Installation

```bash
$ npm i micro-r
```

# About
micro-r is a small routing library utilizing file/folder structures to bind handlers to.
Also, routes are not dynamic and are bound at runtime, rendering "Directory Traversal Attacks" not applicable.

Middlewares can be defined by use() or by dropping index.js files in the desired folders. These must export either a plain middleware function or an array of functions.

# Functions
## on(method, path, handler)
Register custom handlers to specific paths.
* `method` (string); one of: `get, post, put, patch, delete, head, options`
* `path` (string); pathname to match
* `handler` (function); callback function receiving req and res as parameters

## use(middleware)
Register a middleware function.
* `middleware` (function); e.g.`(req, res, next) => next()`

## chain(middlewares)
Transforms an array of middleware functions into a single middleware function.
* `middlewares` (array[function]); similar to use() but with arrays

## register(basepath)
Recursively register the given path and its subfolders.
* `basepath` (string); path to folder

## route(req, res)
Handle the incoming requests.
* `req` (IncomingMessage); server request object
* `res` (ServerResponse); server response object

# Example
Following folder/file structure
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
const router = require('micro-r');
const {send} = require('micro');

const fallback = (req, res) => {
    send(res, '404', 'WOOPS');
};

const {on, use, chain, register, route} = router(fallback);

register('./routes');

// GET: example.com/foo?bier=wurst
on('get', '/foo', async (req, res, query) => {
    // query === {bier: 'wurst'}
    send(res, 200, {foo: 'bar', query});
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
const router = require('micro-r');
const express = require('express');

const app = express();

const fallback = (req, res) => {
    send(res, '404', 'WOOPS');
};

const {register, route} = router(fallback);

register('./routes');

app.use(route);
app.listen(3000);
```
