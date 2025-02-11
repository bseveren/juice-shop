// Emoji: 😺

const express = require('express')
const app = express()
const cors = require('cors')
const PORT = 3000
require('dotenv').config()

const { MongoClient, ServerApiVersion } = require('mongodb')

const mongoUri = process.env.MONGO_URI

const client = new MongoClient(mongoUri, { serverApi: ServerApiVersion.v1 })

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:5173', // Allow only the frontend server to access
  methods: ['GET', 'POST', 'PUT'],
  optionsSuccessStatus: 200, // For legacy browser support
}

app.use(cors(corsOptions)) // Use CORS middleware with specified options

if (process.env.SET_CORS_HEADERS === 'true') {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Credentials', true)
    res.header('Access-Control-Allow-Origin', req.headers.origin)
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    res.header(
      'Access-Control-Allow-Headers',
      'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept'
    )
    next()
  })
}

app.use(express.json())

app.get('/api/', (req, res) => {
  res.send('API response')
})

app.post('/api/get-work-vector-tags', async (req, res) => {
  try {
    await client.connect()

    const db = client.db('recommendation_wizard')
    const works = db.collection('works')

    // Extract idWork from the request body
    const idWork = req.body.idWork

    // Ensure idWork is provided
    if (!idWork) {
      return res.status(400).json({ message: 'Valid idWork must be provided' })
    }

    const initialWork = await works.findOne({ id_work: idWork })

    if (initialWork) {
      const tag_vector = initialWork.vec_descriptors_v2
      const tags = initialWork.tags
      const recommendationVector = initialWork.recommendation_vector

      // Respond with a JSON object
      res.json({ tag_vector: tag_vector, tags: tags, recommendationVector: recommendationVector })
    } else {
      // Send a response indicating no work was found
      res.status(404).json({ message: 'No work found with the specified ID.' })
    }
  } catch (error) {
    // Handle any errors that occur during the request
    console.error('Error occurred:', error)
    res.status(500).json({ error: 'An error occurred' })
  } finally {
    await client.close()
  }
})
