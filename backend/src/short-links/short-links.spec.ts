import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ShortLinkUrlBuilder } from "./short-link-url.builder";
import { ShortLinksService } from "./short-links.service";
import { ShortLinksController } from "./short-links.controller";
import { NfcPayloadService } from "./nfc-payload.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SplitShortLink, LinkType } from "./entities/split-short-link.entity";
import { LinkAccessLog } from "./entities/link-access-log.entity";
import { AuthorizationService } from "../auth/services/authorization.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

describe("ShortLinkUrlBuilder", () => {
  let builder: ShortLinkUrlBuilder;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === "FRONTEND_URL") return "https://app.example.com";
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShortLinkUrlBuilder,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    builder = module.get<ShortLinkUrlBuilder>(ShortLinkUrlBuilder);
    configService = module.get<ConfigService>(ConfigService);
  });

  it("should build short-link URLs with canonical builder", () => {
    const url = builder.buildShortLinkUrl("abc123");
    expect(url).toBe("https://app.example.com/l/abc123");
  });

  it("should build split URLs with canonical builder", () => {
    const url = builder.buildSplitUrl("split-456");
    expect(url).toBe("https://app.example.com/splits/split-456");
  });

  it("should build NFC URLs for split detail pages", () => {
    const url = builder.buildNfcUrl("split-789");
    expect(url).toBe("https://app.example.com/splits/split-789");
  });

  it('should build SEP-0007 payment URIs', () => {
    const uri = builder.buildSep0007Uri('split-payment');
    expect(uri).toContain('web+stellar:pay');
    expect(uri).toContain('split%3Asplit-payment');
  });

  it("should return configured frontend URL", () => {
    const url = builder.getFrontendUrl();
    expect(url).toBe("https://app.example.com");
  });
});

describe("ShortLinksController Auth Enforcement", () => {
  let controller: ShortLinksController;
  let service: Partial<ShortLinksService>;
  let nfcService: Partial<NfcPayloadService>;
  let urlBuilder: Partial<ShortLinkUrlBuilder>;

  beforeEach(async () => {
    service = {
      generate: jest.fn(),
      analytics: jest.fn(),
      remove: jest.fn(),
      resolve: jest.fn(),
      validateNfcAccess: jest.fn(),
    };

    nfcService = {
      generateNdefPayload: jest.fn(),
    };

    urlBuilder = {
      buildNfcUrl: jest.fn((id) => `https://example.com/splits/${id}`),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShortLinksController],
      providers: [
        { provide: ShortLinksService, useValue: service },
        { provide: NfcPayloadService, useValue: nfcService },
        { provide: ShortLinkUrlBuilder, useValue: urlBuilder },
      ],
    }).compile();

    controller = module.get<ShortLinksController>(ShortLinksController);
  });

  it("should generate short link with authenticated user", async () => {
    const user = {
      id: "user-1",
      walletAddress: "wallet-1",
      email: "user@example.com",
      raw: {},
    };
    const dto = { splitId: "split-1", linkType: LinkType.VIEW_SPLIT };

    await controller.generate(dto, user);

    expect(service.generate).toHaveBeenCalledWith(dto, "wallet-1");
  });

  it("should allow unauthenticated resolve to track access", async () => {
    const req = { ip: "127.0.0.1", headers: { "user-agent": "test-agent" } };

    await controller.resolve("abc123", req, undefined);

    expect(service.resolve).toHaveBeenCalledWith(
      "abc123",
      "127.0.0.1",
      "test-agent",
      undefined,
    );
  });

  it("should allow authenticated resolve to include user ID", async () => {
    const user = {
      id: "user-1",
      walletAddress: "wallet-1",
      email: "user@example.com",
      raw: {},
    };
    const req = { ip: "127.0.0.1", headers: { "user-agent": "test-agent" } };

    await controller.resolve("abc123", req, user);

    expect(service.resolve).toHaveBeenCalledWith(
      "abc123",
      "127.0.0.1",
      "test-agent",
      "user-1",
    );
  });

  it("should require auth for analytics access", async () => {
    const user = {
      id: "user-1",
      walletAddress: "wallet-1",
      email: "user@example.com",
      raw: {},
    };

    await controller.analytics("abc123", user);

    expect(service.analytics).toHaveBeenCalledWith("abc123", "wallet-1");
  });

  it("should require auth and validate access for NFC generation", async () => {
    const user = {
      id: "user-1",
      walletAddress: "wallet-1",
      email: "user@example.com",
      raw: {},
    };

    (service.validateNfcAccess as jest.Mock).mockResolvedValue(undefined);

    await controller.generateNfc("split-123", user);

    expect(nfcService.generateNdefPayload).toHaveBeenCalledWith(
      "https://example.com/splits/split-123",
      "split-123",
      "wallet-1",
    );
  });

  it("should reject NFC generation if user lacks split access", async () => {
    const user = {
      id: "user-1",
      walletAddress: "wallet-1",
      email: "user@example.com",
      raw: {},
    };

    (service.validateNfcAccess as jest.Mock).mockRejectedValue(
      new ForbiddenException("Not a member"),
    );

    await expect(controller.generateNfc("split-999", user)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should require auth for delete operations", async () => {
    const user = {
      id: "user-1",
      walletAddress: "wallet-1",
      email: "user@example.com",
      raw: {},
    };

    await controller.remove("abc123", user);

    expect(service.remove).toHaveBeenCalledWith("abc123", "wallet-1");
  });
});

describe("NfcPayloadService", () => {
  let nfcService: NfcPayloadService;
  let shortLinksService: Partial<ShortLinksService>;

  beforeEach(async () => {
    shortLinksService = {
      validateNfcAccess: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NfcPayloadService,
        {
          provide: ShortLinksService,
          useValue: shortLinksService,
        },
      ],
    }).compile();

    nfcService = module.get<NfcPayloadService>(NfcPayloadService);
  });

  it("should generate NDEF payload with valid access", async () => {
    (shortLinksService.validateNfcAccess as jest.Mock).mockResolvedValue(
      undefined,
    );

    const payload = await nfcService.generateNdefPayload(
      "https://example.com/splits/split-1",
      "split-1",
      "wallet-1",
    );

    expect(payload.ndefMessage.tnf).toBe(1);
    expect(payload.ndefMessage.type).toBe("U");
    expect(payload.ndefMessage.payload).toBeDefined();
    expect(shortLinksService.validateNfcAccess).toHaveBeenCalledWith(
      "wallet-1",
      "split-1",
    );
  });

  it("should reject NDEF generation for unauthorized user", async () => {
    (shortLinksService.validateNfcAccess as jest.Mock).mockRejectedValue(
      new ForbiddenException("Not a member"),
    );

    await expect(
      nfcService.generateNdefPayload(
        "https://example.com/splits/split-1",
        "split-1",
        "wallet-999",
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
