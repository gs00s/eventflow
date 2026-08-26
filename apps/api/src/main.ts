import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { env } from './env';
import { startMetricsServer } from './metrics/metrics-server';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false, bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.enableCors({ origin: env.CORS_ORIGIN });
  startMetricsServer();
  await app.listen(env.PORT, '0.0.0.0');
}
void bootstrap();
