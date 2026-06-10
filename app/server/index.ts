import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { createContactsService, ServiceError } from '../src/features/contacts/api/contactsService';
import {
  toWireContact,
  fromWireContact,
  fromWireCreate,
  wireContactSchema,
} from '../src/features/contacts/model/wire';
import { decodeFilters } from '../src/features/contacts/model/filters';

const PORT = Number(process.env.PORT ?? 3001);
const LATENCY_MS = Number(process.env.MOCK_LATENCY_MS ?? 140);

const service = createContactsService();
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Simulate network latency so loading/skeleton states are exercised in dev.
app.use((_req, _res, next) => {
  if (LATENCY_MS > 0) setTimeout(next, LATENCY_MS);
  else next();
});

const api = express.Router();

// Aggregate the contacts landing page loads on mount.
api.get('/people', (_req, res) => {
  res.json(service.overview());
});

api.get('/contacts', (req, res) => {
  const params = new URL(req.url, 'http://localhost').searchParams;
  res.json(service.list(decodeFilters(params)));
});

api.get('/contacts/:id', (req, res) => {
  res.json(toWireContact(service.get(req.params.id)));
});

api.post('/contacts', (req, res) => {
  res.status(201).json(toWireContact(service.create(fromWireCreate(req.body))));
});

api.put('/contacts/:id', (req, res) => {
  const current = service.get(req.params.id);
  const merged = wireContactSchema.parse({ ...toWireContact(current), ...req.body, id: req.params.id });
  res.json(toWireContact(service.update(req.params.id, fromWireContact(merged))));
});

api.delete('/contacts/:id', (req, res) => {
  res.json(service.remove(req.params.id));
});

api.post('/trustees/invite', (req, res) => {
  res.status(201).json(service.inviteTrustee(req.body));
});

api.post('/contacts/import/vcf', (req, res) => {
  res.json(service.importMany(req.body?.contacts));
});

api.post('/contacts/import/google', (req, res) => {
  res.json(service.importMany(req.body?.contacts));
});

// Test-only hook to reset state between e2e runs.
api.post('/__reset', (_req, res) => {
  service.reset();
  res.json({ ok: true });
});

app.use('/api', api);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ServiceError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  console.error('Unexpected server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Mock API listening on http://localhost:${PORT}/api`);
});
