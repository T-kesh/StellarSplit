import { Process, Processor, OnQueueFailed } from "@nestjs/bull";
import { Job } from "bull";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import {
  TaxExportRequest,
  ExportStatus,
  ExportFormat,
} from "./entities/tax-export-request.entity";
import { Split } from "../entities/split.entity";
import { CSVExporterService } from "./exporters/csv-exporter.service";
import { PDFExporterService } from "./exporters/pdf-exporter.service";
import { QBOExporterService } from "./exporters/qbo-exporter.service";
import { JSONExporterService } from "./exporters/json-exporter.service";
import { OFXExporterService } from "./exporters/ofx-exporter.service";
import { ProfileService } from "../profile/profile.service";
import { EmailService } from "../email/email.service";
import { Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { logJobFailure } from "../common/queue-job-policy";

@Processor("compliance-export")
export class ComplianceProcessor {
  private readonly logger = new Logger(ComplianceProcessor.name);
  private readonly exportDir = path.join(process.cwd(), "exports");

  constructor(
    @InjectRepository(TaxExportRequest)
    private exportRepo: Repository<TaxExportRequest>,
    @InjectRepository(Split)
    private splitRepo: Repository<Split>,
    private csvExporter: CSVExporterService,
    private pdfExporter: PDFExporterService,
    private qboExporter: QBOExporterService,
    private jsonExporter: JSONExporterService,
    private ofxExporter: OFXExporterService,
    private emailService: EmailService,
    private profileService: ProfileService,
  ) {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir);
    }
  }

  @Process("generate-export")
  async handleExport(job: Job<{ requestId: string }>) {
    const { requestId } = job.data;
    const request = await this.exportRepo.findOne({ where: { id: requestId } });

    if (!request) {
      this.logger.error(`Export request ${requestId} not found`);
      return;
    }

    try {
      await this.exportRepo.update(requestId, {
        status: ExportStatus.PROCESSING,
      });

      const splits = await this.splitRepo.find({
        where: {
          creatorWalletAddress: request.userId,
          createdAt: Between(request.periodStart, request.periodEnd),
        },
        relations: ["category"],
      });

      let content: string | Buffer;
      let filename = `tax-export-${requestId}`;

      switch (request.exportFormat) {
        case ExportFormat.CSV:
          content = await this.csvExporter.generate(splits);
          filename += ".csv";
          break;
        case ExportFormat.PDF:
          content = await this.pdfExporter.generate(splits);
          filename += ".pdf";
          break;
        case ExportFormat.QBO:
          content = await this.qboExporter.generate(splits);
          filename += ".qbo";
          break;
        case ExportFormat.JSON:
          content = await this.jsonExporter.generate(splits);
          filename += ".json";
          break;
        case ExportFormat.OFX:
          content = await this.ofxExporter.generate(splits);
          filename += ".ofx";
          break;
        default:
          throw new Error(`Unsupported export format: ${request.exportFormat}`);
      }

      const filePath = path.join(this.exportDir, filename);
      fs.writeFileSync(filePath, content);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      await this.exportRepo.update(requestId, {
        status: ExportStatus.READY,
        fileUrl: `http://localhost:3000/api/compliance/export/${requestId}/download`, // Secure download URL
        fileSize: fs.statSync(filePath).size,
        recordCount: splits.length,
        completedAt: new Date(),
        expiresAt,
      });

      // Send email notification
      try {
        const profile = await this.profileService.getByWalletAddress(request.userId);
        const userEmail = profile.email || 'user@example.com'; // fallback
        await this.emailService["emailQueue"].add("sendEmail", {
          to: userEmail,
          type: "export_ready",
          context: {
            requestId,
            format: request.exportFormat,
            downloadUrl: `http://localhost:3000/api/compliance/export/${requestId}/download`,
          },
        });
      } catch (error) {
        this.logger.error(`Failed to get user email for export ${requestId}:`, error);
        // Fallback to placeholder
        await this.emailService["emailQueue"].add("sendEmail", {
          to: "user@example.com",
          type: "export_ready",
          context: {
            requestId,
            format: request.exportFormat,
            downloadUrl: `http://localhost:3000/api/compliance/export/${requestId}/download`,
          },
        });
      }

      this.logger.log(`Export ${requestId} completed successfully`);
    } catch (error) {
      logJobFailure(this.logger, job, error, { context: 'compliance-export' });
      await this.exportRepo.update(requestId, { status: ExportStatus.FAILED });
    }
  }

  /**
   * Dead-letter handler: fires when the compliance export job has exhausted all retries.
   */
  @OnQueueFailed()
  async onFailed(job: Job<{ requestId: string }>, err: Error) {
    logJobFailure(this.logger, job, err, { context: 'compliance-export-dead-letter' });

    const { requestId } = job.data;
    if (requestId) {
      try {
        await this.exportRepo.update(requestId, { status: ExportStatus.FAILED });
      } catch {
        // best effort – the DB may be the cause of the failure
      }
    }
  }
}
