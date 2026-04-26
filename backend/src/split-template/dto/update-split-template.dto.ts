import { PartialType } from "@nestjs/mapped-types";
import { CreateSplitTemplateDto } from "./create-split-template.dto";

export class UpdateSplitTemplateDto extends PartialType(
    CreateSplitTemplateDto,
) {}
