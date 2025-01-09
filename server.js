const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Planet = require('./schema/Planet');
const User = require('./schema/User');

const app = express();
const PORT = 3000;
//Allow undenied access to server for requests made from frontend vite server
const corsOptions = {
  origin: ["http://localhost:5173"],
};
app.use(cors(corsOptions));
app.listen(PORT, () => {
  console.log(`Listening for requests on port ${PORT}`);
});

app.use(express.json());

//Router for /auth/...
app.use('/auth', require('./auth/routes'));
//Router for /users/...
app.use('/users', require('./users/routes'));
//Router for /planets/...
app.use('/planets', require('./planets/routes')); 

const uri = 
  "mongodb+srv://admin:adminpassword@planit-db.80npa.mongodb.net/?retryWrites=true&w=majority&appName=planit-db";

function connect()
{
  try {
    mongoose.connect(uri, {
      autoIndex: true // Ensures indexes are built
    });
    console.log("Connection established with MongoDB");
  } catch (error) {
    console.error(error);
  }
}

connect();
connection = mongoose.connection;