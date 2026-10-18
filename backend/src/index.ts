import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { ENV } from './config/env';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

// Middlewares
app.use(
  cors({
    origin: '*', // In production, replace with specific frontend domain
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(morgan('dev'));

// API Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Library Seat Booking API',
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
  });
});

import { BookingCleanupService } from './services/booking-cleanup.service';

// Mount All Core Routes
app.use('/api', apiRoutes);

// Centralized Error Handling
app.use(errorHandler);

// Start Server only when executed directly
if (require.main === module) {
  app.listen(ENV.PORT, () => {
    console.log(`
  🚀 Library Seat Booking API Server is running!
  📡 Port: http://localhost:${ENV.PORT}
  🩺 Health: http://localhost:${ENV.PORT}/api/health
  📚 Mode: ${ENV.NODE_ENV}
    `);

    // Start background seat cleanup & completion email notification service
    BookingCleanupService.startCronJob();
  });
}

export default app;
