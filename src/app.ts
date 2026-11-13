import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import { createMoviesFeature } from './features/movies';

const app = express();

app.use(express.json());
app.use('/api',createMoviesFeature());
app.use(errorHandler);

// Export the app instance without calling app.listen()
export default app;