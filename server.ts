import dotenv from 'dotenv';
import { createAppServer } from './server/appServer.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const { httpServer } = await createAppServer();
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
