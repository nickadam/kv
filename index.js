'use strict'
const CronJob = require('cron').CronJob
const better_sqlite3 = require('better-sqlite3')

module.exports = path => {
  // connect to sqlite
  const sqlite = new better_sqlite3(path)

  // initialize kv table
  sqlite.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT, ttl INTEGER DEFAULT -1, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)')

  const get = (key, a2, a3) => {
    let options = {}
    let next = undefined
    if(typeof a2 === 'object')
      options = a2
    if(typeof a2 === 'function')
      next = a2
    if(typeof a3 === 'function')
      next = a3

    let q = 'SELECT * FROM kv WHERE k = ? AND (ttl = -1 OR CURRENT_TIMESTAMP < datetime(timestamp, \'+\' || ttl || \' seconds\'))'
    let return_multi = false

    if(key.indexOf('*') > -1){
      return_multi = true
      key = key.replace(/%/g, '\\%')
      key = key.replace(/_/g, '\\_')
      key = key.replace(/\*/g, '%')
      q = 'SELECT * FROM kv WHERE k LIKE ? ESCAPE \'\\\' AND (ttl = -1 OR CURRENT_TIMESTAMP < datetime(timestamp, \'+\' || ttl || \' seconds\'))'
    }

    let data = []
    try{
      data = sqlite.prepare(q).all(key)
    }catch(err){
      if(next)
        return next(err)
      throw err
    }

    // parse the values
    data = data.map(x => {
      x.v = JSON.parse(x.v)
      return x
    })

    if(!return_multi && data.length == 0){
      if(next)
        return next(null, null)
      return null
    }

    if(!return_multi){
      if(next)
        return next(null, options.metadata ? data[0] : data[0].v)
      return options.metadata ? data[0] : data[0].v
    }

    if(next)
      return next(null, options.metadata ? data : data.map(x => x.v))
    return options.metadata ? data : data.map(x => x.v)
  }

  const set = (key, value, a3, a4) => {
    let options = {}
    let next = undefined
    if(typeof a3 === 'object')
      options = a3
    if(typeof a3 === 'function')
      next = a3
    if(typeof a4 === 'function')
      next = a4

    if(key.indexOf('*') > -1){
      if(next)
        return next('\'*\' in keys are not permitted')
      throw '\'*\' in keys are not permitted'
    }

    let q = 'INSERT INTO kv (k,v) VALUES (@k, @v) ON CONFLICT(k) DO UPDATE SET v=@v,ttl=-1,timestamp=CURRENT_TIMESTAMP'
    const data = {
      k: key,
      v: JSON.stringify(value),
    }
    if(options.ttl > -1){
      data.ttl = options.ttl
      q = 'INSERT INTO kv (k,v,ttl) VALUES (@k, @v, @ttl) ON CONFLICT(k) DO UPDATE SET v=@v,ttl=@ttl,timestamp=CURRENT_TIMESTAMP'
    }
    try{
      sqlite.prepare(q).run(data)
    }catch(err){
      if(next)
        return next(err)
      throw err
    }
    if(next)
      return next(null)
    return null
  }

  const del = (key, next) => {
    return set(key, null, {ttl: 0}, next)
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
    del: del,
    quit: quit,
  }
}
