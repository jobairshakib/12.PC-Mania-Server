const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.g1bva.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const partCollection = client.db("PC_Mania").collection("parts");
        const purchaseCollection = client.db("PC_Mania").collection("purchases");
        const userCollection = client.db("PC_Mania").collection("users");

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result , token});
        })

        app.get("/part", async (req, res) => {
            const query = {};
            const cursor = partCollection.find(query);
            const parts = await cursor.toArray();
            res.send(parts);
        });

        app.get("/part/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const part = await partCollection.findOne(query);
            res.send(part);
        });

        // Purchases
        app.get('/purchases', async (req, res) => {
            const query = {};
            const result = await purchaseCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/purchase', async (req, res) => {
            const customer = req.query.customer;
            const query = { customer: customer };
            const result = await purchaseCollection.find(query).toArray();
            res.send(result);
        })

        app.post("/purchase", async (req, res) => {
            const purchase = req.body;
            const result = await purchaseCollection.insertOne(purchase);
            res.send(result);
        });
        
        app.delete('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await purchaseCollection.deleteOne(query);
            res.send(result);
        })

        

        app.put("/part/:id", async (req, res) => {
            const id = req.params.id;
            const updateStock = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = { $set: updateStock };
            const result = await partCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });
        

    } finally {
    }
}
run().catch(console.dir);

app.get('/', async (req, res) => {
    res.send('Welcome to PC Mania')
});

app.listen(port, () => {
    console.log(`Listening to port: ${ port }`);
})
