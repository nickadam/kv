'use strict'
const CronJob = require('cron').CronJob
const better_sqlite3 = require('better-sqlite3')

module.exports = path => {
  // connect to sqlite
  const sqlite = new better_sqlite3(path)

  // initialize kv table
  sqlite.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT, ttl INTEGER DEFAULT -1, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)')

  const get = (key, options, next) => {
    // allow for two or three parameters
    if(next === undefined){
      next = options
      options = {}
    }
    let q = 'SELECT * FROM kv WHERE k = ? AND (ttl = -1 OR CURRENT_TIMESTAMP < datetime(timestamp, \'+\' || ttl || \' seconds\'))'
    let return_multi = false

    if(key.indexOf('*') > -1){
      return_multi = true
      key = key.replace(/\*/g, '%')
      q = 'SELECT * FROM kv WHERE k LIKE ? AND (ttl = -1 OR CURRENT_TIMESTAMP < datetime(timestamp, \'+\' || ttl || \' seconds\'))'
    }

    let data = []
    try{
      data = sqlite.prepare(q).all(key)
    }catch(err){
      return next(err)
    }

    // parse the values
    data = data.map(x => {
      x.v = JSON.parse(x.v)
      return x
    })

    if(!return_multi && data.length == 0)
      return next(null, null)

    if(!return_multi)
      return next(null, options.metadata ? data[0] : data[0].v)

    next(null, options.metadata ? data : data.map(x => x.v))
  }

  const set = (key, value, options, next) => {
    // allow for three or four parameters
    if(next === undefined){
      next = options
      options = {}
    }
    let q = 'INSERT INTO kv (k,v) VALUES (@k, @v) ON CONFLICT(k) DO UPDATE SET v=@v,ttl=-1,timestamp=CURRENT_TIMESTAMP'
    const data = {
      k: key,
      v: JSON.stringify(value),
    }
    if(options.ttl){
      data.ttl = options.ttl
      q = 'INSERT INTO kv (k,v,ttl) VALUES (@k, @v, @ttl) ON CONFLICT(k) DO UPDATE SET v=@v,ttl=@ttl,timestamp=CURRENT_TIMESTAMP'
    }
    try{
      sqlite.prepare(q).run(data)
    }catch(err){
      return next(err)
    }
    next(null)
  }

  const delete_expired = () => {
    sqlite.exec('DELETE FROM kv WHERE ttl > -1 AND CURRENT_TIMESTAMP > datetime(timestamp, \'+\' || ttl || \' seconds\')')
  }

  // delete expired keys from kv once a minute
  const job = new CronJob('0 * * * * *', () => {
    delete_expired()
  }, null, true)
  job.start()

  const quit = () => {
    job.stop()
  }

  // delete expired on init
  delete_expired()

  return {
    get: get,
    set: set,
    quit: quit,
  }
}