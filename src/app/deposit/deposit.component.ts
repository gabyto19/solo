import { Component } from '@angular/core';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-deposit',
  templateUrl: './deposit.component.html',
  styleUrls: ['./deposit.component.css']
})
export class DepositComponent {
  // Form data model
  formData = {
    name: '',
    email: '',
    message: ''
  };

  async onSubmit() {
    try {
      // Load the existing PDF template
      const url = 'assets/papers/deposit-input.pdf'; // Path to your local PDF template
      const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      // Register fontkit
      pdfDoc.registerFontkit(fontkit);

      // Load the Georgian-compatible font
      const fontUrl = 'assets/fonts/NotoSansGeorgian-Regular.ttf'; // Use a known Georgian-compatible font
      const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
      const customFont = await pdfDoc.embedFont(fontBytes);

      // Get today's date
      const today = new Date();
      const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

      // Get the first page of the document
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // Add the current date to the PDF
      firstPage.drawText(`${formattedDate}`, {
        x: 487,
        y: 701,
        size: 12,
        font: customFont,
        color: rgb(0, 0, 0)
      });

      // Add form data to the PDF
      firstPage.drawText(`${this.formData.name}`, {
        x: 143,
        y: 385,
        size: 10,
        font: customFont,
        color: rgb(0, 0, 0)
      });
      firstPage.drawText(`${this.formData.email}`, {
        x: 152,
        y: 369,
        size: 10,
        font: customFont,
        color: rgb(0, 0, 0)
      });
      firstPage.drawText(`${this.formData.message}`, {
        x: 243,
        y: 280,
        size: 12,
        font: customFont,
        color: rgb(0, 0, 0)
      });

      // Serialize the PDFDocument to bytes
      const pdfBytes = await pdfDoc.save();

      // Trigger the file download
      saveAs(
        new Blob([pdfBytes], { type: 'application/pdf' }),
        'სადეპოზიტო-ინვოისი.pdf'
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }
}
