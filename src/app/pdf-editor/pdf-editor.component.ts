import { Component } from '@angular/core';
import { PDFDocument, rgb } from 'pdf-lib';

@Component({
  selector: 'app-pdf-editor',
  templateUrl: './pdf-editor.component.html',
  styleUrls: ['./pdf-editor.component.css']
})
export class PdfEditorComponent {
  modifiedPdf: Uint8Array | null = null;

  async onFileUpload(event: Event): Promise<void> {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const pdfBytes = new Uint8Array(await file.arrayBuffer());
      this.modifiedPdf = await this.modifyPdf(pdfBytes);
    }
  }

  async modifyPdf(pdfBytes: Uint8Array): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get the first page
    const firstPage = pdfDoc.getPage(0);

    // Overwrite the page content (clear existing content)
    firstPage.drawRectangle({
      x: 0,
      y: 720,
      width: firstPage.getWidth(),
      height: firstPage.getHeight(),
      color: rgb(1, 1, 1), // White background
    });

    return await pdfDoc.save();
  }

  downloadModifiedPdf(): void {
    if (this.modifiedPdf) {
      const blob = new Blob([this.modifiedPdf], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Carfax.pdf';
      link.click();
    }
  }
}