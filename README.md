<h1 align="left">micro-r</h1>

file structure based router for micro

***

## Installation

```bash
$ npm i micro-r
```

## Features
* small
* folder/file based routing


## Usage
```register(PATH_TO_ROUTER_FOLDER)```
Register automatically binds a folder recursively. Every folder name becomes a part of the pathname.
Every folder can contain a js file with one or more of the following http method names `get, post, put, patch, delete, head, options`.

## Example

Following folder/file structure
```
routes
├───photo
│   │   get.js
│   │   post.js
│   │   delete.js
│   │
│   └───vacation
│           get.js
│           post.js
│
└───user
        post.js
```
registers the following routes
* `GET:` example.com/photo
* `POST:` example.com/photo
* `DELETE:` example.com/photo
* `GET:` example.com/photo/vacation
* `POST:` example.com/photo/vacation
* `POST:` example.com/user

## Example
```ecmascript 6
const router = require('micro-r');
const {send} = require('micro');

// executes on route miss
// also, no middleware support
const fallback = (req, res) => {
    send(res, '404', 'WOOPS');
};

// initialize router with an optional fallback handle
const {on, use, register, route} = router(fallback);

// recursively register folder and subfolders
register('./routes');

// register custom routes
// GET: example.com/foo?bier=wurst
on('get', '/foo', async  (req, res, query, container) => {
    // query === {bier: 'wurst'}
    send(res, 200, {foo: 'bar', query, container});
});

// register middleware
// executes on every route hit
use((next) => (req, res, query, container) => {
    container.somedata = 123;
    
    // do middleware stuff here
    return next(req, res, query, container);
});

// export route/r to micro
module.exports = route;
```
