const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, MongoRuntimeError } = require('mongodb');

require('dotenv').config();

// middleware

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.3aa5vlu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
    try{

        const usersCollection = client.db("handsFashionShop").collection("users");

        // Users API

        app.post('/users', async (req, res)=>{
            const user = req.body;
            const exist = await usersCollection.findOne({email: user.email});
            if(exist){
                return res.send({status: 0, message: 'User already exist.'})
            }
            
            console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        

    }
    finally{

    }
}

run().catch(err => console.log(err));

app.get('/', (req, res)=>{
    res.send('AK-Hands Fashion Shop Running')
});

app.listen(port, ()=>{
    console.log(`AK-Hands Fashion Shop Running on port ${port}`);
})