
const express = require('express');
const cors = require('cors');
const http = require('http');
const axios = require('axios');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v26.0';

app.get('/', (req, res) => {
  res.json({
    service: 'Meta Leads Backend',
    status: 'running',
  });
});

// Meta webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (
    mode === 'subscribe' &&
    token === process.env.META_VERIFY_TOKEN
  ) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Fetch one lead's actual details from Meta
async function fetchLeadDetails(leadgenId) {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('META_PAGE_ACCESS_TOKEN is missing in backend/.env');
  }

  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(leadgenId)}`;

  const response = await axios.get(url, {
    params: {
      fields: 'id,created_time,field_data,form_id,ad_id',
      access_token: accessToken,
    },
    timeout: 15000,
  });

  const metaLead = response.data;
  const fields = {};

  for (const field of metaLead.field_data || []) {
    fields[field.name.toLowerCase()] = field.values?.[0] ?? '';
  }

  const firstName = fields.first_name || '';
  const lastName = fields.last_name || '';

  const name =
    fields.full_name ||
    fields.name ||
    `${firstName} ${lastName}`.trim() ||
    'Unknown lead';

  return {
    id: String(metaLead.id || leadgenId),
    name,
    email: fields.email || '',
    phone:
      fields.phone_number ||
      fields.phone ||
      fields.mobile_phone ||
      '',
    createdAt: metaLead.created_time
      ? new Date(metaLead.created_time).toLocaleString()
      : new Date().toLocaleString(),
  };
}

// Handle incoming lead notifications
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object !== 'page') {
    return res.sendStatus(404);
  }

  // Acknowledge immediately; retrieve details in the background.
  res.sendStatus(200);

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue;

      const leadgenId = change.value?.leadgen_id;

      if (!leadgenId) {
        console.warn('leadgen notification did not include leadgen_id');
        continue;
      }

      console.log('Meta lead notification received:', leadgenId);

      fetchLeadDetails(leadgenId)
        .then((lead) => {
          io.emit('new_lead', lead);
          console.log('Lead details fetched and broadcast:', lead.id);
        })
        .catch((error) => {
          const details = error.response?.data || error.message;
          console.error('Could not retrieve Meta lead:', details);
        });
    }
  }
});

// Development-only dummy lead endpoint
app.post('/test-lead', (req, res) => {
  const lead = {
    id: String(Date.now()),
    name: req.body.name || 'Test Lead',
    email: req.body.email || 'test@example.com',
    phone: req.body.phone || '9999999999',
    createdAt: new Date().toLocaleString(),
  };

  io.emit('new_lead', lead);

  return res.status(201).json({
    message: 'Test lead broadcast',
    lead,
  });
});

io.on('connection', (socket) => {
  console.log('App connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('App disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Meta Leads backend running on port ${PORT}`);
});
