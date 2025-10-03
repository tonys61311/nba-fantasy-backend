import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController (e2e-style unit)', () => {
  let app: INestApplication;
  const serviceMock = {
    login: jest.fn(),
    getMe: jest.fn(),
  } as Partial<AuthService> as AuthService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login should call service.login and return payload', async () => {
    (serviceMock.login as jest.Mock).mockResolvedValue({ uid: 'U1', email: 'a@b.com', role: 'guest' });
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Authorization', 'Bearer tok')
      .expect(201)
      .expect({ uid: 'U1', email: 'a@b.com', role: 'guest' });
  });

  it('GET /auth/me should parse Authorization header and return me', async () => {
    (serviceMock.getMe as jest.Mock).mockResolvedValue({ uid: 'U1', email: 'a@b.com', role: 'member' });
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer tok')
      .expect(200)
      .expect({ uid: 'U1', email: 'a@b.com', role: 'member' });
  });

  it('GET /auth/me should 401 when no Authorization header', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
  });
});


