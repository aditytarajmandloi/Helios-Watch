require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB. Wiping collections...');
    await mongoose.connection.db.dropCollection('metrics').catch(() => console.log('Metrics not dropped'));
    await mongoose.connection.db.dropCollection('alerts').catch(() => console.log('Alerts not dropped'));
    console.log('Data cleared.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
