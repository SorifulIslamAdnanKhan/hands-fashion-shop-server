const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, MongoRuntimeError, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_KEY);


// Middleware

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.3aa5vlu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// Verify JWT

function verifyJWT (req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message: 'Unauthorized access'})
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_JWT_TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'Forbidden access'})
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
       
        // Database Collections

        const usersCollection = client.db("handsFashionShop").collection("users");
        const categoriesCollection = client.db("handsFashionShop").collection("categories");
        const productsCollection = client.db("handsFashionShop").collection("products");
        const ordersCollection = client.db("handsFashionShop").collection("orders");
        const paymentsCollection = client.db("handsFashionShop").collection("payments");

        // JWT API

        app.get('/jwt', async(req, res)=>{
            const email = req.query.email;
            const query = {email: email}
            const user = await usersCollection.findOne(query);
            if(user){
                const token = jwt.sign({email}, process.env.ACCESS_JWT_TOKEN, {expiresIn: '1h'})
                return res.send({accessAuthToken: token});
            }
            
            res.status(403).send({accessAuthToken: ''})
        });
        
        // Admin, Sellers and Buyers API

        app.post('/users', async (req, res) => {
            const user = req.body;
            const exist = await usersCollection.findOne({ email: user.email });
            if (exist) {
                return res.send({ status: 0, message: 'User already exist.' })
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'Admin' })
        });

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'Seller' })
        });

        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'Buyer' })
        });

        app.get('/users/sellers', async(req, res)=>{
            const role = req.params.role;
            const query = {role: 'Seller'}
            const sellers = await usersCollection.find(query).toArray();
            res.send(sellers);
        });

        app.get('/users/buyers', async(req, res)=>{
            const role = req.params.role;
            const query = {role: 'Buyer'}
            const buyers = await usersCollection.find(query).toArray();
            res.send(buyers);
        });

        app.delete('/users/seller/:id', async (req, res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });

        app.delete('/users/buyer/:id', async (req, res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });

        // Category API

        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        });

        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await categoriesCollection.findOne(filter);
            res.send(result)
        });

        // Product API

        app.post('/product', async (req, res) => {
            const product = req.body;
            const postDate = new Date();
            const salesStatus = 'Available';
            const result = await productsCollection.insertOne({ ...product, postDate, salesStatus });
            res.send(result);
        });

        app.patch('/product/:id', async (req, res)=>{
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const advertise = req.body.advertise;
            const updatedDoc = {
                $set: {
                    advertise: 'True',
                }
            }
            const result = await productsCollection.updateOne(query, updatedDoc);
            res.send(result);
        });

        app.get('/product/advertise', async (req, res)=>{
            const advertise = req.params.advertise;
            const query = {advertise: 'True'};
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/products', async (req, res)=>{
            let query = {};

            if(req.query.category){
                query= {
                    category: req.query.category
                }
            }

            const cursor = productsCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        })

        app.get('/my-products', async (req, res) => {

            let query = {};

            if(req.query.sellerEmail){
                query= {
                    sellerEmail: req.query.sellerEmail
                }
            }

            const cursor = productsCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        app.delete('/product/:id', async (req, res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        });

        // Orders API

        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        });

        app.get('/orders', async (req, res)=>{

            let query = {};

            if(req.query.email){
                query= {
                    email: req.query.email
                }
            }

            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });

        app.get('/orders/:id', async (req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const order = await ordersCollection.findOne(query);
            res.send(order);
        });

        // Stripe

        app.post('/create-payment-intent', verifyJWT, async (req, res)=>{
            const order = req.body;
            const price = order.resalePrice;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                  ]
            })

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        // Payment

        app.post('/payments', verifyJWT, async (req, res)=>{
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.orderId;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
                $set:{
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await ordersCollection.updateOne(filter, updatedDoc)
            res.send(result);
        });

    }
    finally {

    }
}

run().catch(err => console.log(err));

app.get('/', (req, res) => {
    res.send('AK-Hands Fashion Shop Running')
});

app.listen(port, () => {
    console.log(`AK-Hands Fashion Shop Running on port ${port}`);
})