import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EstrategiaJwt } from './estrategias/estrategia-jwt';
import { LdapService } from './ldap.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secreto'),
        signOptions: {
          expiresIn: config.get<string>('jwt.expiracion') ?? '8h',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LdapService, EstrategiaJwt],
  exports: [AuthService],
})
export class AuthModule {}
