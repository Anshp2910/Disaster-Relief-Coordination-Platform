const mongoose = require('mongoose');
const { SosAlert } = require('./src/models/SosAlert.js');
console.log('Model loaded successfully');
console.log('Schema paths:', Object.keys(SosAlert.schema.paths));

