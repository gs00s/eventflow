import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { env } from './env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter());
  app.enableCors({ origin: env.CORS_ORIGIN });
  await app.listen(env.PORT, '0.0.0.0');
}
void bootstrap();
