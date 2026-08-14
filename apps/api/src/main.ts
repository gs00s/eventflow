import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter());
  app.enableCors({ origin: 'http://localhost:5173' });
  await app.listen(Number(process.env.PORT) || 3000, '0.0.0.0');
}
void bootstrap();
