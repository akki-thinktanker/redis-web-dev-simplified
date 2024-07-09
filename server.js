require('dotenv').config()
const express = require('express')
const axios = require('axios')
const cors = require('cors')
const { createClient } = require('redis')

const DEFAULT_EXPIRATION = 3600


const redisClient = createClient({
    password: process.env.REDIS_PW,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

const app = express()
app.use(cors())

redisClient.connect().catch(console.error);

app.get('/photos', async (req, res) => {
    const albumId = req.query.albumId;

    try {
        const cachedPhotos = await redisClient.get(`photos?albumId=${albumId}`)

        if (cachedPhotos) {
            console.log('cache hit')
            return res.json(JSON.parse(cachedPhotos))
        } else {
            // fetch data from external source
            console.log('cache miss')

            const { data } = await axios.get('https://jsonplaceholder.typicode.com/photos', { params: { albumId } })
            redisClient.setEx(`photos?albumId=${albumId}`, DEFAULT_EXPIRATION, JSON.stringify(data))
            return res.json(data);
        }
    } catch (err) {
        console.log(err)
        res.status(500).send('Server error')
    }
})

app.get('/photos/:id', async (req, res) => {
    try {
        const cachedPhotos = await redisClient.get(`photos:${req.params.id}`)

        if (cachedPhotos) {
            console.log('cache hit')
            return res.json(JSON.parse(cachedPhotos))
        } else {
            // fetch data from external source
            console.log('cache miss')

            const { data } = await axios.get(`https://jsonplaceholder.typicode.com/photos/${req.params.id}`)
            redisClient.setEx(`photos:${req.params.id}`, DEFAULT_EXPIRATION, JSON.stringify(data))
            return res.json(data);
        }
    } catch (err) {
        console.log(err)
        res.status(500).send('Server error')
    }
})

app.listen(3000)