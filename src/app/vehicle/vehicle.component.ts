import { Component } from '@angular/core';
import { PDFDocument, rgb } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';
import { saveAs } from 'file-saver';
@Component({
  selector: 'app-vehicle',
  templateUrl: './vehicle.component.html',
  styleUrl: './vehicle.component.css'
})
export class VehicleComponent {
  formData = {
    name: '',
    lastName: '',
    vinCode: '',
    amount: ''
  };

  async onSubmit() {
    try {
      // Load the existing PDF template
      const url = 'assets/papers/vehicle-input.pdf'; // Path to your PDF template
      const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      // Register fontkit
      pdfDoc.registerFontkit(fontkit.default);

      // Load the custom font
      const fontUrl = 'assets/fonts/NotoSansGeorgian-Regular.ttf'; // Georgian-compatible font
      const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
      const customFont = await pdfDoc.embedFont(fontBytes);

      // Generate automatic values
      const today = new Date();
      const formattedToday = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
      const expiresDate = new Date(today);
      expiresDate.setDate(today.getDate() + 7);
      const formattedExpires = `${expiresDate.getDate()}/${expiresDate.getMonth() + 1}/${expiresDate.getFullYear()}`;
      const invoiceNumber = this.formData.vinCode.slice(-5); // Last 5 characters of VIN

      // Get the first page of the document
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // Add form data to the PDF
      firstPage.drawText(`${this.formData.name}`, {
        x: 220,
        y: 534,
        size: 16,
        font: customFont,
        color: rgb(0.5, 0.5, 0.5)
      });
      firstPage.drawText(`${this.formData.lastName}`, {
        x: 264,
        y: 498,
        size: 16,
        font: customFont,
        color: rgb(0.5, 0.5, 0.5)
      });
      firstPage.drawText(`${this.formData.vinCode}`, {
        x: 170,
        y: 471,
        size: 15,
        font: customFont,
        color: rgb(0.5, 0.5, 0.5)
      });
      firstPage.drawText(`${this.formData.amount}`, {
        x: 475,
        y: 410,
        size: 16,
        font: customFont,
        color: rgb(0.5, 0.5, 0.5)
      });
      firstPage.drawText(`${invoiceNumber}`, {
        x: 508,
        y: 762,
        size: 14,
        font: customFont,
        color: rgb(0.5, 0.5, 0.5)
      });
      firstPage.drawText(`${formattedToday}`, {
        x: 450,
        y: 736,
        size: 14,
        font: customFont,
        color: rgb(0.5, 0.5, 0.5)
      });
      firstPage.drawText(`${formattedExpires}`, {
        x: 460,
        y: 717,
        size: 14,
        font: customFont,
        color: rgb(0.5, 0.5, 0.5)
      });

      // Serialize the PDFDocument to bytes
      const pdfBytes = await pdfDoc.save();

      // Trigger the file download
      saveAs(
        new Blob([pdfBytes], { type: 'application/pdf' }),
        `ინვოისი`
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }
}
