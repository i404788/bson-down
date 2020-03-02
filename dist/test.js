const levelup = require('levelup');
const leveldown = require('leveldown');
const level = require('level')
const bsondown = require('./index').default;

let ldb = leveldown('test', {})
let bdb = new bsondown(ldb, {encodeValue: JSON.stringify, decodeValue: JSON.parse})
let udb = levelup(bdb, {}, () => {
    z = udb.put('a', 'abc', () => {
        ldb.get('a', (_, x) => { 
            console.log('raw:', Buffer.from(x).toString()) 
            udb.get('a', (_, x) => {
                console.log('bsondown:', x)
                udb.close()
                let edb = level('test', {}, () => {
                    edb.get('a', console.log.bind(null, 'level:'))
                })
            })
        })
    })
})

