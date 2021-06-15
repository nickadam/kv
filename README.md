# @nickadam/kv [![Build Status](https://github.com/nickadam/kv/actions/workflows/build.yml/badge.svg)](https://github.com/nickadam/kv/actions/workflows/build.yml?query=branch%3Amain)
A simple key value database backed by sqlite3

# Features
- Auto-expiring entries
- Wildcard matching
- Synchronous and asynchronous formats
- In-memory database (great for testing)
- Store and retrieve native objects (no need to serialize)

# Installation

```bash
npm install @nickadam/kv
```

# Usage

### Examples

Sync

```js
const kv = require('@nickadam/kv')('/path/to/file.db')

kv.set('mykey', {stuff: 'things'})

const data = kv.get('mykey')

console.log(data) // {stuff: 'things'}

kv.quit()
```

Async

```js
const kv = require('@nickadam/kv')('/path/to/file.db')

kv.set('mykey', {stuff: 'things'}, err => {
  if(err) return err

  kv.get('mykey', (err, data) => {
    kv.quit()

    console.log(data) // {stuff: 'things'}
  })
})
```

Set entries to expire using the `ttl` option.

```js
kv.set('mykey', {stuff: 'things'}, {ttl: 10}) // expires in 10 seconds
```

Get a list of values matching keys with the wildcard `*`.

```js
kv.set('mykey', {stuff: 'things'})

kv.set('yourkey', 100)

const data = kv.get('*key')

console.log(data) // [{stuff: 'things'}, 100]
```

Get the metadata associated with entries using the `metadata` option.

```js
kv.set('mykey', {stuff: 'things'})

const data = kv.get('mykey', {metadata: true})

console.log(data)
/*
{
  k: 'mykey',
  v: { stuff: 'things' },
  ttl: -1,
  timestamp: '2021-06-06 12:27:58'
}
*/
```

Delete entries

```js
kv.del('mykey')
```

```js
kv.del('mykey', err => {
  // check err and do stuff
})
```

Use an ephemeral in-memory database with the path `:memory:`

```js
const kv = require('@nickadam/kv')(':memory:')
```

# More information

Expired entries are deleted at startup. For long running applications, a background job will delete expired entries once a minute - so long as you do not execute `kv.quit()`. Expired entries that have not yet been deleted will not return.

Values are encoded and decoded using `JSON.stringify` and `JSON.parse`.

This database was built using these amazing projects:
- [better-sqlite3](https://www.npmjs.com/package/better-sqlite3)
- [cron](https://www.npmjs.com/package/cron)
