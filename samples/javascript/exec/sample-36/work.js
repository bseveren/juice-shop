const EventEmitter = require('events')
const { exec } = require('child_process')
const path = require('path')
const { Store } = require('fs-json-store')
require('colors')
const {update_crawltest} = require("./lib/api");
const scrape = require('./scrape.js')

const store = new Store({ file: './store/work.json' })
const {crawlerdata} = require('./logger');

class WorkEmitter extends EventEmitter {}

const work = new WorkEmitter()

work.queue = {}
work.running = {}

work.add = add
work.flush = flush
work.exec = execWork
work.queueIsEmpty = queueIsEmpty

store.read().then(list => {
  if (list) {
    work.queue = list

    // Iterate through the object and remove keys with empty arrays
    for (const jkey in work.queue) {
      if (typeof work.queue[jkey] === "undefined" || work.queue[jkey].length === 0) {
        delete work.queue[jkey];
      }
    }

    if (work.queue.hasOwnProperty("undefined")) {
      delete work.queue.undefined;
    }

    // Remove empty arrays
    Object.keys(work.queue).forEach(id => {
      if (work.queue[id].length === 0) {
        delete work.queue[id]
      }
    });

    Object.keys(work.queue).forEach(id => {
      const queue = work.queue[id]
      if (!work.running[id] && queue[0]) runWorkItem(queue[0])
    })

    setInterval(function () {
      store.write(Object.assign({}, work.queue))
    }, 10000)
  }
})

async function runWorkItem (workItem) {
  const queue = work.queue[workItem.queue]
  work.running[workItem.queue] = workItem
  work.emit('running', workItem)

  await execWork(workItem, async function (err, res) {
    if (err) {
      workItem.error = { code: 'FAILED-REPLAY', message: err }
      if (workItem.mode === 'test') {
        let ressult = 'false'
        let updatedresult = updateBody(workItem,ressult)
        responder = await update_crawltest(updatedresult)
      }
    }
    // work done; remove from queue
    if (queue){
      if (workItem.mode === 'test') {
        let ressult
        if (workItem.error != '') {
          ressult = 'false'
        }
        else {
          ressult = 'true'
        }
        let updatedresult = updateBody(workItem,ressult)
        responder = await update_crawltest(updatedresult)
      }
      queue.splice(queue.indexOf(workItem), 1)
      crawlerdata.info('removed workitem by successfully');
      // Add functin to check queue
      clearQueue(queue)
      work.emit('testdone', workItem)
    }
    if (workItem.mode !== 'test') {
      work.emit('done', workItem)
    }
    // In test, we need disable this emit.

    // if there is more work to be done
    if (queue) {
      if (queue.length > 0) {
        await runWorkItem(queue[0])
      } else {
        work.queue[workItem.queue] = undefined
        work.running[workItem.queue] = undefined
      }
    }
  })
}

async function execWork (workItem, cb) {
  try {
    updateValues(workItem)
  } catch (error) {
    console.error('An error occurred during updateValues:', error.message);
    cb(error.message); // Pass the error to the callback function
    return; // Exit the function to prevent further execution
  }

  if (!workItem.id) workItem.id = Date.now()
  if (typeof workItem.queue === 'undefined') {
    workItem.queue = workItem.company_id
  }
  let filepath = path.join(__dirname, 'downloads',
      '' + workItem.queue || 'test',
      `${workItem.id}.pdf`
  )
  // The recipe
  const recipe = typeof workItem.recipe === 'object' ? JSON.stringify(workItem.recipe) : workItem.recipe

  // parsing domain out of it.
  const preRec = JSON.parse(recipe)
  const parsedUrl = new URL(preRec.url)
  const domain = parsedUrl.hostname
  const version = preRec.version

  console.log('current: ' + domain + ' version: ' + version)

  // here is default and test-flags set
  let testflags = ""
  let replayscript = "replay.js"
  if (workItem.mode === 'test') {
    testflags = "-t"
  }
  // here we can build conditions if needed by domain-base
  if (domain === 'www.website1.com' || domain === 'website2.com' || version == 4) {
    replayscript = "replaynew.js"
  }

  // building command
  const command = `${path.join(__dirname, replayscript)} '${recipe}' ${filepath} ${testflags}`

  console.log(command.green)

  if (!workItem.queue) console.log(command.green)

  exec(command, async function (err, stdout, stderr) {
    if (err) return cb(stderr)
    if (workItem.mode === 'test') {
      let ressult = 'true'
      let updatedresult = updateBody(workItem,ressult)
      responder = await update_crawltest(updatedresult) //Disable email, if needed
    }
    if (workItem.mode !== 'test' ) {
      // hash the file
      workItem.hash = scrape.fileToHash(filepath)
      cb()
    }

    if (workItem.mode === 'test') {
      const queue = work.queue[workItem.queue];
      if (queue) {
        queue.splice(queue.indexOf(workItem), 1);
        clearQueue(queue)
      } else {
        crawlerdata.error('Queue is undefined. Unable to splice workItem.');
      }
      crawlerdata.info('removed workitem by successfully');
    }
  })
}
