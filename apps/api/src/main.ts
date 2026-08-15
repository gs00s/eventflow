import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { env } from './env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.enableCors({ origin: env.CORS_ORIGIN });
  await app.listen(env.PORT, '0.0.0.0');
}
void bootstrap();
