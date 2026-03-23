import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { Nodo } from './entities/nodo.entity';
import { Alerta } from './entities/alerta.entity';
import { AccionProtocolo } from './entities/accion-protocolo.entity';
import { LogForense } from './entities/log-forense.entity';
import { LogsModule } from './logs/logs.module';
import { SimulacionModule } from './simulacion/simulacion.module';
import { NodosModule } from './nodos/nodos.module';
import { AlertasModule } from './alertas/alertas.module';
import { AnalisisModule } from './analisis/analisis.module';
import { RecuperacionModule } from './recuperacion/recuperacion.module';
import { TimelineModule } from './timeline/timeline.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5433,
      username: 'postgres',
      password: 'postgres',
      database: 'arcashield',
      entities: [Nodo, Alerta, AccionProtocolo, LogForense],
      synchronize: true,
      logging: false,
    }),
    PrismaModule,
    UsersModule,
    MailModule,
    AuthModule,
    SimulacionModule,
    NodosModule,
    AlertasModule,
    AnalisisModule,
    RecuperacionModule,
    TimelineModule,
    LogsModule,
  ],
  providers: [CsrfMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
