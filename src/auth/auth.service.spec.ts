import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseService } from '../firebase/firebase.service';

type MockFirestoreDoc = {
  get: jest.Mock<Promise<{ exists: boolean; data: () => Record<string, unknown> }>, []>;
  set: jest.Mock<Promise<void>, [Record<string, unknown>]>;
  update: jest.Mock<Promise<void>, [Record<string, unknown>]>;
};

type MockFirestore = {
  collection: jest.Mock<{
    doc: (id: string) => MockFirestoreDoc;
  }, [string]>;
};

function createMockFirestore(state: {
  user?: { uid: string; email: string; role: string } | null;
  whitelistRole?: string | null;
}): MockFirestore {
  const userDoc: MockFirestoreDoc = {
    get: jest.fn(async () => ({
      exists: Boolean(state.user),
      data: () => (state.user ? { ...state.user } : ({} as Record<string, unknown>)),
    })),
    set: jest.fn<Promise<void>, [Record<string, unknown>]>(async () => void 0),
    update: jest.fn<Promise<void>, [Record<string, unknown>]>(async () => void 0),
  };

  const whitelistDoc: MockFirestoreDoc = {
    get: jest.fn(async () => ({
      exists: typeof state.whitelistRole === 'string',
      data: () => ({ role: state.whitelistRole ?? undefined }),
    })),
    set: jest.fn<Promise<void>, [Record<string, unknown>]>(async () => void 0),
    update: jest.fn<Promise<void>, [Record<string, unknown>]>(async () => void 0),
  };

  return {
    collection: jest.fn((name: string) => ({
      doc: (id: string) => {
        if (name === 'users') return userDoc;
        if (name === 'whitelist') return whitelistDoc;
        throw new Error(`Unexpected collection ${name} (${id})`);
      },
    })),
  } as unknown as MockFirestore;
}

describe('AuthService', () => {
  let service: AuthService;
  let firebase: FirebaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: FirebaseService,
          useValue: {
            getAuth: jest.fn(() => ({ verifyIdToken: jest.fn() })),
            getFirestore: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    firebase = module.get<FirebaseService>(FirebaseService);
  });

  it('verifyToken should return uid and email on valid token', async () => {
    const mockAuth = (firebase.getAuth as jest.Mock)();
    (firebase.getAuth as jest.Mock).mockReturnValue(mockAuth);
    mockAuth.verifyIdToken.mockResolvedValue({ uid: 'U1', email: 'a@b.com' });

    const out = await service.verifyToken('token');
    expect(out).toEqual({ uid: 'U1', email: 'a@b.com' });
  });

  it('verifyToken should throw Unauthorized on invalid token', async () => {
    const mockAuth = (firebase.getAuth as jest.Mock)();
    mockAuth.verifyIdToken.mockRejectedValue(new Error('bad'));

    await expect(service.verifyToken('bad')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login should update lastLogin when user exists and override role from whitelist', async () => {
    const mockAuth = (firebase.getAuth as jest.Mock)();
    (firebase.getAuth as jest.Mock).mockReturnValue(mockAuth);
    mockAuth.verifyIdToken.mockResolvedValue({ uid: 'U1', email: 'a@b.com' });
    const mockDb = createMockFirestore({ user: { uid: 'U1', email: 'a@b.com', role: 'member' }, whitelistRole: 'admin' });
    (firebase.getFirestore as jest.Mock).mockReturnValue(mockDb);

    const out = await service.login('token');
    expect(out).toEqual({ uid: 'U1', email: 'a@b.com', role: 'admin' });
  });

  it('login should create user with whitelist role when not exists and email whitelisted', async () => {
    const mockAuth = (firebase.getAuth as jest.Mock)();
    (firebase.getAuth as jest.Mock).mockReturnValue(mockAuth);
    mockAuth.verifyIdToken.mockResolvedValue({ uid: 'U2', email: 'w@l.com' });
    const mockDb = createMockFirestore({ user: null, whitelistRole: 'admin' });
    (firebase.getFirestore as jest.Mock).mockReturnValue(mockDb);

    const out = await service.login('token2');
    expect(out).toEqual({ uid: 'U2', email: 'w@l.com', role: 'admin' });
  });

  it('login should create user with guest role when not whitelisted', async () => {
    const mockAuth = (firebase.getAuth as jest.Mock)();
    (firebase.getAuth as jest.Mock).mockReturnValue(mockAuth);
    mockAuth.verifyIdToken.mockResolvedValue({ uid: 'U3', email: 'x@y.com' });
    const mockDb = createMockFirestore({ user: null, whitelistRole: null });
    (firebase.getFirestore as jest.Mock).mockReturnValue(mockDb);

    const out = await service.login('token3');
    expect(out).toEqual({ uid: 'U3', email: 'x@y.com', role: 'guest' });
  });

  it('getMe should return uid, email, role overridden from whitelist when user exists', async () => {
    const mockAuth = (firebase.getAuth as jest.Mock)();
    (firebase.getAuth as jest.Mock).mockReturnValue(mockAuth);
    mockAuth.verifyIdToken.mockResolvedValue({ uid: 'U9', email: 'm@e.com' });
    const mockDb = createMockFirestore({ user: { uid: 'U9', email: 'm@e.com', role: 'member' }, whitelistRole: 'admin' });
    (firebase.getFirestore as jest.Mock).mockReturnValue(mockDb);

    const out = await service.getMe('token9');
    expect(out).toEqual({ uid: 'U9', email: 'm@e.com', role: 'admin' });
  });

  it('getMe should throw NotFound when user not exists', async () => {
    const mockAuth = (firebase.getAuth as jest.Mock)();
    (firebase.getAuth as jest.Mock).mockReturnValue(mockAuth);
    mockAuth.verifyIdToken.mockResolvedValue({ uid: 'U10', email: 'none@x.com' });
    const mockDb = createMockFirestore({ user: null });
    (firebase.getFirestore as jest.Mock).mockReturnValue(mockDb);

    await expect(service.getMe('tok')).rejects.toThrow('User not found');
  });
});


