/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { seedDatabase } from './database/seeder';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';

import express from 'express';
import serverless from 'serverless-http';
import { ExpressAdapter } from '@nestjs/platform-express';

let server: any;

async function bootstrap() {
  const expressApp = express();

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const reflector = app.get(Reflector);

  app.useGlobalGuards(
    new JwtAuthGuard(reflector),
    new PermissionsGuard(reflector),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.init();

  const dataSource = app.get(DataSource);

  try {
    await seedDatabase(dataSource);
    console.log('Database seeded (cold start)');
  } catch (err) {
    console.error('Seeding failed on cold start:', err);
  }

  return serverless(expressApp);
}

export const handler = async (event: any, context: any) => {
  if (!server) {
    server = await bootstrap();
  }

  return server(event, context);
};
