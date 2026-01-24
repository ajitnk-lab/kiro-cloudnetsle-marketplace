const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const PDFDocument = require('pdfkit');
const https = require('https');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});
const sesClient = new SESClient({});

const COMPANY_SETTINGS_TABLE = process.env.COMPANY_SETTINGS_TABLE;
const PAYMENT_TRANSACTIONS_TABLE = process.env.PAYMENT_TRANSACTIONS_TABLE;
const INVOICE_BUCKET = process.env.INVOICE_BUCKET;

// Get financial year (Apr-Mar)
function getFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  if (month >= 4) {
    // Apr-Dec: FY is current year to next year
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    // Jan-Mar: FY is previous year to current year
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

// Get GST state code
function getStateCode(stateName) {
  const stateCodes = {
    'Jammu and Kashmir': '01',
    'Himachal Pradesh': '02',
    'Punjab': '03',
    'Chandigarh': '04',
    'Uttarakhand': '05',
    'Haryana': '06',
    'Delhi': '07',
    'Rajasthan': '08',
    'Uttar Pradesh': '09',
    'Bihar': '10',
    'Sikkim': '11',
    'Arunachal Pradesh': '12',
    'Nagaland': '13',
    'Manipur': '14',
    'Mizoram': '15',
    'Tripura': '16',
    'Meghalaya': '17',
    'Assam': '18',
    'West Bengal': '19',
    'Jharkhand': '20',
    'Odisha': '21',
    'Chhattisgarh': '22',
    'Madhya Pradesh': '23',
    'Gujarat': '24',
    'Dadra and Nagar Haveli and Daman and Diu': '26',
    'Maharashtra': '27',
    'Karnataka': '29',
    'Goa': '30',
    'Lakshadweep': '31',
    'Kerala': '32',
    'Tamil Nadu': '33',
    'Puducherry': '34',
    'Andaman and Nicobar Islands': '35',
    'Telangana': '36',
    'Andhra Pradesh': '37',
    'Ladakh': '38'
  };
  
  return stateCodes[stateName] || '99';
}

// Get next invoice number
async function getNextInvoiceNumber() {
  const fy = getFinancialYear();
  const counterKey = `invoice-counter-${fy}`;
  
  try {
    const result = await docClient.send(new UpdateCommand({
      TableName: COMPANY_SETTINGS_TABLE,
      Key: { settingKey: counterKey },
      UpdateExpression: 'SET #counter = if_not_exists(#counter, :start) + :inc',
      ExpressionAttributeNames: { '#counter': 'counter' },
      ExpressionAttributeValues: { ':start': 0, ':inc': 1 },
      ReturnValues: 'UPDATED_NEW'
    }));
    
    const counter = result.Attributes.counter;
    return `INV/${fy}/${String(counter).padStart(4, '0')}`;
  } catch (err) {
    console.error('Error getting invoice number:', err);
    // Fallback to transaction ID
    return null;
  }
}

exports.handler = async (event) => {
  try {
    const payload = event.body ? JSON.parse(event.body) : event;
    const { transactionId, customerEmail } = payload;

    // Fetch transaction details
    const transaction = await docClient.send(new GetCommand({
      TableName: PAYMENT_TRANSACTIONS_TABLE,
      Key: { transactionId }
    }));

    if (!transaction.Item) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Transaction not found' }) };
    }

    const txn = transaction.Item;

    // Only generate invoice if billing info exists
    if (!txn.billingCountry) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No billing info, skipping invoice' }) };
    }

    // Fetch company settings
    const company = await docClient.send(new GetCommand({
      TableName: COMPANY_SETTINGS_TABLE,
      Key: { settingKey: 'gst-company-info' }
    }));

    if (!company.Item) {
      throw new Error('Company settings not found');
    }

    // Get invoice number
    const invoiceNumber = await getNextInvoiceNumber() || transactionId;

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(txn, company.Item, invoiceNumber);

    // Upload to S3
    const invoiceKey = `invoices/${new Date().getFullYear()}/${transactionId}.pdf`;
    await s3Client.send(new PutObjectCommand({
      Bucket: INVOICE_BUCKET,
      Key: invoiceKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf'
    }));

    // Generate pre-signed URL (valid for 7 days)
    const invoiceUrl = await getSignedUrl(s3Client, new GetObjectCommand({
      Bucket: INVOICE_BUCKET,
      Key: invoiceKey
    }), { expiresIn: 604800 });

    // Send email
    try {
      const customerName = txn.customerName.replace(/ Name$/, '');
      await sesClient.send(new SendEmailCommand({
        Source: 'noreply@cloudnestle.com',
        Destination: { ToAddresses: [customerEmail] },
        Message: {
          Subject: { Data: `Invoice ${invoiceNumber} - CloudNestle Marketplace` },
          Body: {
            Html: {
              Data: `
                <html>
                  <body style="font-family: Arial, sans-serif;">
                    <h2>Thank you for your purchase!</h2>
                    <p>Dear ${customerName},</p>
                    <p>Your payment has been successfully processed. Please find your invoice details below:</p>
                    <ul>
                      <li><strong>Invoice Number:</strong> ${invoiceNumber}</li>
                      <li><strong>Amount:</strong> ₹${txn.totalAmount}</li>
                      <li><strong>Product:</strong> ${txn.solutionName}</li>
                    </ul>
                    <p><a href="${invoiceUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Invoice</a></p>
                    <p>This link is valid for 7 days.</p>
                    <br>
                    <p>Best regards,<br>CloudNestle Team</p>
                  </body>
                </html>
              `
            }
          }
        }
      }));
    } catch (emailError) {
      console.log('Email sending failed:', emailError.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ invoiceUrl, message: 'Invoice generated successfully' })
    };
  } catch (error) {
    console.error('Invoice generation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function generateInvoicePDF(transaction, company, invoiceNumber) {
  // Download logo from S3
  let logoBuffer = null;
  try {
    const logoResponse = await s3Client.send(new GetObjectCommand({
      Bucket: INVOICE_BUCKET,
      Key: 'assets/cloudnestle-logo.png'
    }));
    const chunks = [];
    for await (const chunk of logoResponse.Body) {
      chunks.push(chunk);
    }
    logoBuffer = Buffer.concat(chunks);
  } catch (err) {
    console.log('Logo not found, skipping:', err.message);
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 80;
    const leftMargin = 40;
    const rightMargin = doc.page.width - 40;

    // Add logo (top left)
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, leftMargin + 10, 50, { width: 80 });
        // Company name under logo
        doc.fontSize(9).font('Helvetica-Bold').text('CloudNestle Consulting & Services', leftMargin + 10, 95);
        // Place of Supply with state code
        const stateCode = getStateCode(transaction.billingState);
        doc.fontSize(8).font('Helvetica').text(`Place of Supply: ${stateCode}-${transaction.billingState}`, leftMargin + 10, 108);
        // GST Number
        doc.text(`GSTIN: ${company.gstin}`, leftMargin + 10, 120);
      } catch (err) {
        console.log('Error adding logo:', err.message);
      }
    }

    // Header with border
    doc.rect(leftMargin, 40, pageWidth, 100).stroke();
    
    // TAX INVOICE title (center)
    doc.fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', leftMargin, 50, { 
      width: pageWidth, 
      align: 'center' 
    });
    
    // Original for Recipient (small font under title)
    doc.fontSize(8).font('Helvetica').text('Original for Recipient', leftMargin, 70, { 
      width: pageWidth, 
      align: 'center' 
    });

    // Invoice details box (top right) - moved down
    const invoiceBoxX = rightMargin - 200;
    doc.fontSize(9).font('Helvetica');
    doc.text('Invoice #:', invoiceBoxX, 90);
    doc.text(invoiceNumber, invoiceBoxX + 50, 90, { width: 140 });
    doc.text('Invoice Date:', invoiceBoxX, 105);
    doc.text(new Date(transaction.createdAt).toLocaleDateString('en-IN'), invoiceBoxX + 50, 105);
    doc.text('Due Date:', invoiceBoxX, 120);
    doc.text(new Date(transaction.createdAt).toLocaleDateString('en-IN'), invoiceBoxX + 50, 120);

    // Seller and Buyer details section
    let yPos = 150;
    doc.rect(leftMargin, yPos, pageWidth, 110).stroke();
    doc.moveTo(leftMargin + pageWidth/2, yPos).lineTo(leftMargin + pageWidth/2, yPos + 110).stroke();

    // Seller Details (Left)
    doc.fontSize(10).font('Helvetica-Bold').text('Seller Details:', leftMargin + 10, yPos + 10);
    doc.fontSize(9).font('Helvetica');
    doc.text(company.legalName || 'CloudNestle', leftMargin + 10, yPos + 25);
    doc.text(`GSTIN: ${company.gstin || '29AAHCC6393P1ZV'}`, leftMargin + 10, yPos + 38);
    doc.text(company.address || 'Bangalore, Karnataka', leftMargin + 10, yPos + 51, { width: pageWidth/2 - 20 });
    doc.text(`${company.city}, ${company.state} - ${company.postalCode}`, leftMargin + 10, yPos + 70);

    // Buyer Details (Right)
    const buyerX = leftMargin + pageWidth/2 + 10;
    doc.fontSize(10).font('Helvetica-Bold').text('Buyer Details:', buyerX, yPos + 10);
    doc.fontSize(9).font('Helvetica');
    doc.text(transaction.customerName.replace(/ Name$/, ''), buyerX, yPos + 25);
    
    // Add buyer GSTIN if business purchase
    let currentY = yPos + 38;
    if (transaction.isBusinessPurchase && transaction.gstin) {
      doc.text(`GSTIN: ${transaction.gstin}`, buyerX, currentY);
      currentY += 13;
    }
    if (transaction.companyName) {
      doc.text(`Company: ${transaction.companyName}`, buyerX, currentY);
      currentY += 13;
    }
    
    doc.text(`Email: ${transaction.customerEmail}`, buyerX, currentY);
    currentY += 13;
    doc.text(`Phone: ${transaction.customerPhone || 'N/A'}`, buyerX, currentY);
    currentY += 13;
    
    if (transaction.billingAddress) {
      doc.text(transaction.billingAddress, buyerX, currentY, { width: pageWidth/2 - 20 });
      currentY += 19;
    }
    doc.text(`${transaction.billingCity}, ${transaction.billingState}`, buyerX, currentY);
    currentY += 13;
    doc.text(`${transaction.billingCountry} - ${transaction.billingPostalCode}`, buyerX, currentY);

    // Export/LUT Declaration for international invoices
    const isInternational = transaction.billingCountry !== 'IN';
    if (isInternational) {
      yPos = 270;
      doc.rect(leftMargin, yPos, pageWidth, 30).fillAndStroke('#fff3cd', '#000');
      doc.fillColor('#000').fontSize(9).font('Helvetica-Bold');
      doc.text('Export Declaration:', leftMargin + 10, yPos + 8);
      doc.font('Helvetica').fontSize(8);
      doc.text('Supply meant for export under Letter of Undertaking (LUT)', leftMargin + 10, yPos + 20);
      doc.text('LUT ARN: AD291225033708W', leftMargin + 300, yPos + 20);
      yPos = 310;
    } else {
      yPos = 280;
    }

    // Items Table
    const tableTop = yPos;
    const col1 = leftMargin + 5;
    const col2 = leftMargin + 30;
    const col3 = leftMargin + 250;
    const col4 = leftMargin + 320;
    const col5 = leftMargin + 360;
    const col6 = leftMargin + 410;
    const col7 = leftMargin + 480;

    // Table header
    doc.rect(leftMargin, tableTop, pageWidth, 25).fillAndStroke('#f0f0f0', '#000');
    doc.fillColor('#000').fontSize(9).font('Helvetica-Bold');
    doc.text('#', col1, tableTop + 8);
    doc.text('Item', col2, tableTop + 8);
    doc.text('HSN/SAC', col3, tableTop + 8);
    doc.text('Rate', col4, tableTop + 8);
    doc.text('Qty', col5, tableTop + 8);
    doc.text('Taxable', col6, tableTop + 8);
    doc.text('Amount', col7, tableTop + 8);

    // Table row
    yPos = tableTop + 25;
    doc.rect(leftMargin, yPos, pageWidth, 30).stroke();
    doc.font('Helvetica').fontSize(9);
    doc.text('1', col1, yPos + 10);
    doc.text(transaction.solutionName || 'AWS Solution Finder - Pro Tier', col2, yPos + 10, { width: 210 });
    doc.text(company.hsnSacCode || '998315', col3, yPos + 10);
    doc.text('INR ' + String(transaction.baseAmount), col4, yPos + 10);
    doc.text('1', col5, yPos + 10);
    doc.text('INR ' + String(transaction.baseAmount), col6, yPos + 10);
    doc.text('INR ' + String(transaction.totalAmount), col7, yPos + 10);

    // Totals section
    yPos += 40;
    const totalsX = rightMargin - 220;
    doc.fontSize(9).font('Helvetica');
    doc.text('Taxable Amount:', totalsX, yPos);
    doc.text('INR ' + String(transaction.baseAmount), totalsX + 120, yPos);
    
    yPos += 12;
    
    // For international invoices, show IGST as 0% (zero-rated export)
    if (isInternational) {
      doc.text('IGST (0% - Export under LUT):', totalsX, yPos);
      doc.text('INR 0.00', totalsX + 120, yPos);
    } else if (transaction.gstRate) {
      const isIntraState = transaction.billingState === 'Karnataka';
      
      if (isIntraState) {
        // Intra-state: Show CGST and SGST separately
        const halfRate = transaction.gstRate / 2;
        const halfAmount = transaction.gstAmount / 2;
        
        doc.text(`CGST ${halfRate}%:`, totalsX, yPos);
        doc.text('INR ' + String(halfAmount.toFixed(2)), totalsX + 120, yPos);
        yPos += 12;
        
        doc.text(`SGST ${halfRate}%:`, totalsX, yPos);
        doc.text('INR ' + String(halfAmount.toFixed(2)), totalsX + 120, yPos);
      } else {
        // Inter-state: Show IGST only
        doc.text(`IGST ${transaction.gstRate}%:`, totalsX, yPos);
        doc.text('INR ' + String(transaction.gstAmount), totalsX + 120, yPos);
      }
    }

    yPos += 15;
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Total:', totalsX, yPos);
    doc.text('INR ' + String(transaction.totalAmount), totalsX + 120, yPos);

    // Amount in words
    yPos += 20;
    doc.fontSize(9).font('Helvetica');
    const amountInWords = numberToWords(transaction.totalAmount);
    doc.text(`Amount in words: ${amountInWords}`, leftMargin, yPos);

    // Footer section - moved down by 8 lines (60 pixels)
    yPos += 85;
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Bank Details:', leftMargin, yPos);
    doc.font('Helvetica').fontSize(8);
    doc.text('Bank: Indian Overseas Bank', leftMargin, yPos + 12);
    doc.text('Branch: BILEKAHALLI (1524)', leftMargin, yPos + 24);
    doc.text('Account No: 152402000001010', leftMargin, yPos + 36);
    doc.text('Type: Current', leftMargin, yPos + 48);
    doc.text('Name: CLOUDNESTLE CONSULTING & SERVICES', leftMargin, yPos + 60);
    doc.text('IFSC: IOBA0001524', leftMargin, yPos + 72);

    // PAID stamp (if payment is completed)
    if (transaction.status === 'completed') {
      doc.fontSize(40).font('Helvetica-Bold').fillColor('green').opacity(0.3);
      doc.text('PAID', doc.page.width / 2 - 60, 400, {
        width: 120,
        align: 'center'
      });
      doc.opacity(1).fillColor('#000');
    }

    // Authorized Signature
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Authorized Signatory', rightMargin - 120, yPos + 60);

    // Thank you message
    yPos += 90;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
    doc.text('THANK YOU FOR YOUR BUSINESS', leftMargin, yPos, {
      width: pageWidth,
      align: 'center'
    });

    // Computer-generated note
    yPos += 15;
    doc.fontSize(7).font('Helvetica-Oblique').fillColor('#666');
    doc.text('This is a computer-generated invoice and does not require a physical signature or hard copy.', 
      leftMargin, yPos, {
      width: pageWidth,
      align: 'center'
    });

    doc.end();
  });
}

function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero Rupees Only';
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let words = '';
  
  // Convert rupees
  if (rupees > 0) {
    const numStr = rupees.toString();
    const len = numStr.length;
    
    if (len > 5) {
      const lakh = parseInt(numStr.substring(0, len - 5));
      if (lakh > 0) words += convertToWords(lakh) + ' Lakh ';
    }
    if (len > 3) {
      const thousand = parseInt(numStr.substring(Math.max(0, len - 5), len - 3));
      if (thousand > 0) words += convertToWords(thousand) + ' Thousand ';
    }
    const hundred = parseInt(numStr.substring(Math.max(0, len - 3)));
    if (hundred > 0) words += convertToWords(hundred) + ' ';
    
    words += 'Rupees';
  }
  
  // Convert paise
  if (paise > 0) {
    if (rupees > 0) words += ' And ';
    words += convertToWords(paise) + ' Paise';
  }
  
  return words.trim() + ' Only';
}

function convertToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (num === 0) return '';
  if (num < 10) return ones[num];
  if (num >= 10 && num < 20) return teens[num - 10];
  if (num >= 20 && num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return tens[ten] + (one > 0 ? '-' + ones[one] : '');
  }
  if (num >= 100) {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    return ones[hundred] + ' Hundred' + (remainder > 0 ? ' ' + convertToWords(remainder) : '');
  }
  return '';
}
