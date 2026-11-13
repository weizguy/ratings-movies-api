import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import { createMoviesFeature } from './features/movies';

const app = express();

app.use(express.json());
app.use('/api',createMoviesFeature());

app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
  });

app.use(errorHandler);

export default app;