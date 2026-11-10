import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🔴 Server Error:', err.stack || err);
  res.status(500).json({ error: 'Internal Server Error' });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
};