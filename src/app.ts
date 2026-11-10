import express from 'express';
import movieRouter from './features/movies/movie.routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());
app.use('/api', movieRouter);
app.use(notFoundHandler);
app.use(errorHandler);

// Export the app instance without calling app.listen()
export default app;