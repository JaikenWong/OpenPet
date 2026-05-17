const axios = require('axios');
axios.post('http://127.0.0.1:8642/v1/chat/completions', {
  model: 'hermes-agent',
  messages: [{role: 'user', content: 'Hello!'}]
}, {
  headers: { 'Authorization': 'Bearer jiccencewong@dari', 'Content-Type': 'application/json' }
}).then(r => console.log(r.data)).catch(e => console.log('ERROR:', e.response ? e.response.status : e.message));
