require('dotenv').config();
const mongoose = require('mongoose');
const { fetchElectronData } = require('./dataIngestion');

async function testElectrons() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Fetching electrons...');
  
  // Create a mock socket io to verify it doesn't crash on io.emit
  const ioMock = { emit: (event, payload) => console.log('Emitted', event, payload) };
  
  await fetchElectronData(ioMock);
  console.log('Done fetching electrons!');
  process.exit(0);
}
testElectrons();
