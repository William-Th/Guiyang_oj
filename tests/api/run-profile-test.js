/**
 * Test runner wrapper - disables proxy for axios
 */

// Configure axios to not use proxy
process.env.NO_PROXY = 'localhost,127.0.0.1';
process.env.HTTP_PROXY = '';
process.env.HTTPS_PROXY = '';

const axios = require('axios');

// Override axios defaults to disable proxy
axios.defaults.proxy = false;

// Now run the actual test
require('./profile-api-test.js');
