import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 API Server is running on http://localhost:${PORT}`);
});