const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.once('open', () => console.log('Connected to MongoDB Atlas'));


app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));


const Item = require('./models/Item');

app.get('/', async (req, res) => {
  const items = await Item.find();
  res.render('dashboard', { items });
});

app.get('/generate', (req, res) => {
  res.render('dashboard');
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

  res.download(qrPath, `item_${savedItem._id}.png`, (err) => {
    if (err) {
      console.error('Error sending QR code file:', err);
      res.status(500).send('Error generating the QR code');
    }
  });
});


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
  

    if (status === 'assigned') {

      const lastItem = await Item.findOne({ team, type, status: 'assigned' })
        .sort({ date: -1 });
  

      const lastNumber = lastItem && lastItem.itemId ? parseInt(lastItem.itemId.split('-').pop()) : 0;
      const newNumber = lastNumber + 1;
  
  
      const itemId = `${team}-${type}-${newNumber}`;
  
     
      await Item.findByIdAndUpdate(req.params.id, {
        name,
        team,
        type,
        status,
        itemId,
        date: new Date(),
      });
    } else {
      
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




app.get('/update/:id/:action', async (req, res) => {
  const { id, action } = req.params;
  const status = action === 'faulty' ? 'faulty' : 'unassigned';
  date = new Date();
//   console.log(date)
  await Item.findByIdAndUpdate(id, { status }, {date});
  res.redirect('/');
});


app.get('/team/:team', async (req, res) => {
    const team = req.params.team;
    const items = await Item.find({ team });
    res.render('team_page', { team, items });
  });
  

app.get('/user/:name', async (req, res) => {
    const name = req.params.name;
    const items = await Item.find({ name });
    res.render('user_page', { name, items });
  });

  app.get('/debug', (req, res) => {
  res.send({
    viewsPath: app.get('views'),
    cwd: process.cwd(),
    dirContent: require('fs').readdirSync(path.join(__dirname, 'views')),
  });
});



app.listen(8080, () => console.log('Server running on http://localhost:8080'));
