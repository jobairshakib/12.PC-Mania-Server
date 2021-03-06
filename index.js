const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.g1bva.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const partCollection = client.db("PC_Mania").collection("parts");
        const purchaseCollection = client.db("PC_Mania").collection("purchases");
        const userCollection = client.db("PC_Mania").collection("users");
        const reviewCollection = client.db("PC_Mania").collection("reviews");
        const paymentCollection = client.db("PC_Mania").collection("payments");

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: {role:'admin'},
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                return res.send(result);
            }
            else {
                return res.status(403).send({ message: 'Forbidden Access' });
            }
        });

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result , token});
        })

        // upadte user
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.get('/user', async (req, res) => {
            const email = req.params.email;
            const query = {email: email}
            const result = await userCollection.findOne(query);
            
            res.send(result);
        })

        app.get("/part", async (req, res) => {
            const query = {};
            const cursor = partCollection.find(query);
            const parts = await cursor.toArray();
            res.send(parts);
        });

        app.post('/addPart', async (req, res) => {
            const part = req.body;
            const result = await partCollection.insertOne(part);
            res.send(result);
        })

        app.get("/part/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const part = await partCollection.findOne(query);
            res.send(part);
        });
        app.delete('/part/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await partCollection.deleteOne(query);
            res.send(result);
        })

        // Purchases
        app.get('/purchases', async (req, res) => {
            const query = {};
            const result = await purchaseCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/purchase', verifyJWT, async (req, res) => {
            const customer = req.query.customer;
            const decodedEmail = req.decoded.email;
            if (customer === decodedEmail) {
                const query = { customer: customer };
                const result = await purchaseCollection.find(query).toArray();
                return res.send(result);
            }
            else {
                return res.status(403).send({ message: 'Forbidden Access' });
            }
        })

        app.get('/purchase/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const purchase = await purchaseCollection.findOne(query);
            res.send(purchase);
        })

        app.post("/purchase", async (req, res) => {
            const purchase = req.body;
            const result = await purchaseCollection.insertOne(purchase);
            res.send(result);
        });

        app.patch('/purchase/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                },
            };

            const result = await paymentCollection.insertOne(payment);
            const updatePurchase = await purchaseCollection.updateOne(filter, updateDoc);
            res.send(updateDoc);

        })
        
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
        // Review
        app.get('/review', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        app.post('/addReview', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })

        // Payment
        app.post('/create-payment-intent', verifyJWT, async(req, res)=> {
            const purchase = req.body;
            const price = purchase.totalPrice;
            const amount = price; 
            // upore (price * 100) dile kichu product e total price beshi hole error dicche..
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "bdt",
                // payment_method_types: ['card']
                automatic_payment_methods: {
                    enabled: true,
                },
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })
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
