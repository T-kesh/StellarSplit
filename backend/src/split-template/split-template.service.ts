import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { SplitTemplate } from "./entities/split-template.entity";
import { Repository } from "typeorm";
import { CreateSplitTemplateDto } from "./dto/create-split-template.dto";
import { UpdateSplitTemplateDto } from "./dto/update-split-template.dto";
import { CreateSplitFromTemplateDto } from "./dto/create-split-from-template.dto";
import { SplitsService } from "../modules/splits/splits.service";
import { CreateItemDto, CreateParticipantDto, CreateSplitDto } from "../modules/splits/dto/split.dto";
import { Split } from "../entities/split.entity";

@Injectable()
export class SplitTemplateService {
    constructor(
        @InjectRepository(SplitTemplate)
        private readonly repo: Repository<SplitTemplate>,
        private readonly splitsService: SplitsService,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    create(userId: string, dto: CreateSplitTemplateDto) {
        const template = this.repo.create({ ...dto, userId });
        return this.repo.save(template);
    }

    findAllForUser(userId: string) {
        return this.repo.find({ where: { userId } });
    }

    findOne(id: string) {
        return this.repo.findOneBy({ id });
    }

    update(id: string, dto: UpdateSplitTemplateDto) {
        return this.repo.update(id, dto);
    }

    delete(id: string) {
        return this.repo.delete(id);
    }

    async createSplitFromTemplate(
        templateId: string,
        dto?: CreateSplitFromTemplateDto,
    ): Promise<Split> {
        return this.dataSource.transaction(async (manager: any) => {
            const templateRepo = manager.getRepository(SplitTemplate);
            const template = await templateRepo.findOneBy({ id: templateId });

            if (!template) throw new NotFoundException("Template not found");

            // Increment usage inside the same transaction as split creation.
            await templateRepo.increment({ id: templateId }, "usageCount", 1);

            const participantsInput =
                dto?.participantOverrides ?? template.defaultParticipants ?? [];
            const itemsInput =
                dto?.itemOverrides ?? template.defaultItems ?? [];

            const description =
                dto?.customName ?? template.description ?? template.name;

            const taxPercentage = Number(template.taxPercentage ?? 0);
            const tipPercentage = Number(template.tipPercentage ?? 0);

            const normalizedItems = this.normalizeItems(itemsInput);
            const subtotal = normalizedItems.reduce(
                (sum, i) => sum + Number(i.totalPrice),
                0,
            );

            const taxAmount = subtotal * (taxPercentage / 100);
            const tipAmount = subtotal * (tipPercentage / 100);
            const totalAmount = this.round2(subtotal + taxAmount + tipAmount);

            const normalizedParticipants = this.normalizeParticipants(
                participantsInput,
                totalAmount,
                template.defaultParticipants ?? [],
            );

            const createSplitDto: CreateSplitDto = {
                totalAmount,
                description,
                creatorWalletAddress: template.userId,
                // preferredCurrency defaults inside SplitsService
                participants: normalizedParticipants,
                items: normalizedItems,
            };

            return this.splitsService.createSplit(createSplitDto, manager);
        });
    }

    private round2(value: number): number {
        return Math.round(value * 100) / 100;
    }

    private normalizeItems(items: any[] | undefined): CreateItemDto[] {
        const normalized = (items ?? []).map((item) => {
            const name = String(item?.name ?? item?.itemName ?? item?.title ?? "");
            if (!name) throw new BadRequestException("Item.name is required");

            const quantity = Number(item?.quantity ?? item?.qty ?? 1);
            const unitPrice = Number(
                item?.unitPrice ?? item?.price ?? item?.unit_price ?? 0,
            );
            const totalPrice = Number(
                item?.totalPrice ?? item?.total ?? unitPrice * quantity,
            );

            // In the current backend, item allocations are stored as Participant IDs
            // (resolved later). Template items typically don't include those IDs.
            const assignedToIds =
                item?.assignedToIds ??
                item?.participantIds ??
                item?.assignedTo ??
                [];

            return {
                name,
                quantity,
                unitPrice,
                totalPrice,
                category: item?.category,
                assignedToIds,
            } as CreateItemDto;
        });

        return normalized;
    }

    private normalizeParticipants(
        participants: any[] | undefined,
        totalAmount: number,
        fallbackParticipants: any[] = [],
    ): CreateParticipantDto[] {
        const list = participants ?? [];
        if (list.length === 0) return [];

        const hasExplicitAmounts = list.some(
            (p) => typeof p?.amountOwed === "number" && !Number.isNaN(p.amountOwed),
        );

        const round2 = (v: number) => Math.round(v * 100) / 100;

        // First pass: compute weights.
        let weights: number[];

        if (hasExplicitAmounts) {
            weights = list.map((p) => Number(p.amountOwed ?? 0));
            const sumWeights = weights.reduce((s, w) => s + w, 0);
            if (sumWeights > 0) {
                weights = weights.map((w) => (w / sumWeights) * totalAmount);
            } else {
                weights = list.map(() => round2(totalAmount / list.length));
            }
        } else {
            weights = list.map((p) => {
                const share =
                    p?.share ??
                    p?.percentage ??
                    p?.pct ??
                    p?.weight ??
                    undefined;
                return share === undefined || share === null ? NaN : Number(share);
            });

            const validWeights = weights.filter((w) => !Number.isNaN(w));
            const sumShares = validWeights.reduce((s, w) => s + w, 0);
            if (sumShares > 0) {
                weights = weights.map((weight) =>
                    !Number.isNaN(weight)
                        ? (weight / sumShares) * totalAmount
                        : 0,
                );
            } else {
                weights = list.map(() => round2(totalAmount / list.length));
            }
        }

        // Second pass: rounding adjustment so participant totals sum exactly.
        const allocated = weights.map((w) => round2(w));
        const allocatedSum = allocated.reduce((s, a) => s + a, 0);
        const delta = round2(totalAmount - allocatedSum);
        if (Math.abs(delta) > 0.001 && allocated.length > 0) {
            // Apply adjustment to the largest allocated participant.
            let maxIdx = 0;
            for (let i = 1; i < allocated.length; i++) {
                if (allocated[i] > allocated[maxIdx]) maxIdx = i;
            }
            allocated[maxIdx] = round2(allocated[maxIdx] + delta);
        }

        return list.map((p, idx) => {
            const explicitId = p?.userId ?? p?.walletAddress ?? p?.id;
            const fallback =
                fallbackParticipants[idx] ??
                fallbackParticipants.find(
                    (fp) => fp?.name && p?.name && fp.name === p.name,
                );

            const userId = String(explicitId ?? fallback?.userId ?? fallback?.walletAddress ?? fallback?.id ?? "");
            if (!userId || userId === "undefined" || userId === "null") {
                throw new BadRequestException(
                    "Each template participant must include userId/walletAddress (or be mappable from template defaults)",
                );
            }

            return {
                userId,
                walletAddress: p?.walletAddress ?? fallback?.walletAddress ?? userId,
                amountOwed: allocated[idx] ?? 0,
            } as CreateParticipantDto;
        });
    }
}
