const express = require('express');
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const path = require('path');

const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.once('open', () => console.log('Connected to MongoDB'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Models
const Item = require('./models/Item');

// Routes
// Route: Dashboard
app.get('/', async (req, res) => {
  const items = await Item.find();
  res.render('dashboard', { items });
});

// Route: Generate QR Code
app.get('/generate', (req, res) => {
  res.render('form');
});

app.post('/generate', async (req, res) => {
  const newItem = new Item({
    status: 'unassigned',
    date: new Date(),
  });
  const savedItem = await newItem.save();

  // Generate QR Code
  const formUrl = `${req.protocol}://${req.get('host')}/form/${savedItem._id}`;
  const qrPath = path.join(__dirname, 'public/qr_codes', `item_${savedItem._id}.png`);
  await QRCode.toFile(qrPath, formUrl);

  // Update item with QR code path
  savedItem.qrCodePath = `/qr_codes/item_${savedItem._id}.png`;
  await savedItem.save();

  res.redirect('/');
});

// Route: Item Form
app.get('/form/:id', async (req, res) => {
  const item = await Item.findById(req.params.id);
  res.render('assign_form', { item });
});

// app.post('/form/:id', async (req, res) => {
//   const { name, team, type, status } = req.body;
//   await Item.findByIdAndUpdate(req.params.id, {
//     name,
//     team,
//     type,
//     status,
//     date: new Date(),
//   });
//   res.redirect('/');
// });
app.post('/form/:id', async (req, res) => {
    const { name, team, type, status } = req.body;
  
    // Check if item is being assigned
    if (status === 'assigned') {
      // Get the last assigned item with the same team and type
      const lastItem = await Item.findOne({ team, type, status: 'assigned' })
        .sort({ date: -1 });
  
      // Determine the new item number
      const lastNumber = lastItem && lastItem.itemId ? parseInt(lastItem.itemId.split('-').pop()) : 0;
      const newNumber = lastNumber + 1;
  
      // Generate the new item ID
      const itemId = `${team}-${type}-${newNumber}`;
  
      // Update the item in the database
      await Item.findByIdAndUpdate(req.params.id, {
        name,
        team,
        type,
        status,
        itemId,
        date: new Date(),
      });
    } else {
      // Update item without generating a new ID
      await Item.findByIdAndUpdate(req.params.id, {
        name,
        team,
        type,
        status,
        date: new Date(),
      });
    }
  
    res.redirect('/');
  });



// Route: Update Item (Faulty/Unassign)
app.get('/update/:id/:action', async (req, res) => {
  const { id, action } = req.params;
  const status = action === 'faulty' ? 'faulty' : 'unassigned';
  date = new Date();
//   console.log(date)
  await Item.findByIdAndUpdate(id, { status }, {date});
  res.redirect('/');
});

// Route: Team Items Page
app.get('/team/:team', async (req, res) => {
    const team = req.params.team;
    const items = await Item.find({ team });
    res.render('team_page', { team, items });
  });
  
// Route: User Items Page
app.get('/user/:name', async (req, res) => {
    const name = req.params.name;
    const items = await Item.find({ name });
    res.render('user_page', { name, items });
  });
  

// Start Server
app.listen(5000, () => console.log('Server running on http://localhost:5000'));
