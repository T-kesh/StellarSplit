import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { SplitTemplateService } from "./split-template.service";
import { CreateSplitTemplateDto } from "./dto/create-split-template.dto";
import { CreateSplitFromTemplateDto } from "./dto/create-split-from-template.dto";
import { Split } from "../entities/split.entity";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/types/auth-user.interface";

@Controller("split-templates")
export class SplitTemplateController {
    constructor(private readonly service: SplitTemplateService) {}

    @Post()
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateSplitTemplateDto) {
        return this.service.create(user.walletAddress, dto);
    }

    @Get()
    findAll(@CurrentUser() user: AuthUser) {
        return this.service.findAllForUser(user.walletAddress);
    }

    @Post(":id/create-split")
    createSplit(
        @Param("id") id: string,
        @Body() dto?: CreateSplitFromTemplateDto,
    ): Promise<Split> {
        return this.service.createSplitFromTemplate(id, dto);
    }
}
