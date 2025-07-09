const express = require('express');
const mongoose = require('mongoose');
const SalesAgentRoutes = require('./routes/SalesAgentRoutes');
const CustomerRoutes = require('./routes/CustomerRoutes')
//const cors = require('cors');
require('dotenv').config();

const app = express();
//app.use(cors());
app.use(express.json());

const PORT = 3000;



app.listen(PORT, ()=>{

    console.log(`server is running on ${PORT}`)
}
)

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.log('DB connection error:', err));



//Routes:
app.use('/SalesAgent/', SalesAgentRoutes);
app.use('/Customer/', CustomerRoutes);