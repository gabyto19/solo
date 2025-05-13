import { Component } from '@angular/core';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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

    // Embed custom font for slim text
    const slimFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Get the first page
    const firstPage = pdfDoc.getPage(0);

    // Add an image above the rectangle
    const imageUrl = '/assets/imgs/carfax.png'; // Replace with your image path or base64
    const imageBytes = await fetch(imageUrl).then(res => res.arrayBuffer());
    const image = await pdfDoc.embedPng(imageBytes); // Use embedJpg for JPEGs
    const imageDims = image.scale(0.4); // Adjust scaling as needed

    // white background under the logo
    // firstPage.drawRectangle({
    //   x: 0,
    //   y: 720,
    //   width: firstPage.getWidth(),
    //   height: firstPage.getHeight(),
    //   color: rgb(1, 1, 1), // White background
    // });

     // Draw the image
     firstPage.drawImage(image, {
      x: 0,
      y: 720, // Adjust the Y-coordinate to position it above the rectangle
      width: imageDims.width,
      height: imageDims.height,
    });
    // Draw the white rectangle
    firstPage.drawRectangle({
      x: 10,
      y: 447,
      width: 80,
      height: 14,
      color: rgb(1, 1, 1), // White background
    });

    // Draw slim text
    firstPage.drawText('Solo Auto Import', {
      x: 14,
      y: 452, // Adjust Y-coordinate to position the text
      size: 10,
      font: slimFont, // Use the slim custom font
      color: rgb(0, 0, 0),
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