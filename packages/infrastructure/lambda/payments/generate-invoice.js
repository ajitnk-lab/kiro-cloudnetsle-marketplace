const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const PDFDocument = require('pdfkit');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});
const sesClient = new SESClient({});

const COMPANY_SETTINGS_TABLE = process.env.COMPANY_SETTINGS_TABLE;
const PAYMENT_TRANSACTIONS_TABLE = process.env.PAYMENT_TRANSACTIONS_TABLE;
const INVOICE_BUCKET = process.env.INVOICE_BUCKET;

exports.handler = async (event) => {
  try {
    const { transactionId, customerEmail } = JSON.parse(event.body || event);

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
      Key: { companyId: 'cloudnestle-main' }
    }));

    if (!company.Item) {
      throw new Error('Company settings not found');
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(txn, company.Item);

    // Upload to S3
    const invoiceKey = `invoices/${new Date().getFullYear()}/${transactionId}.pdf`;
    await s3Client.send(new PutObjectCommand({
      Bucket: INVOICE_BUCKET,
      Key: invoiceKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf'
    }));

    const invoiceUrl = `https://${INVOICE_BUCKET}.s3.amazonaws.com/${invoiceKey}`;

    // Send email (if SES is configured)
    try {
      await sesClient.send(new SendEmailCommand({
        Source: 'noreply@cloudnestle.com',
        Destination: { ToAddresses: [customerEmail] },
        Message: {
          Subject: { Data: `Invoice for Order ${transactionId}` },
          Body: {
            Text: { Data: `Your invoice is attached. You can also download it from: ${invoiceUrl}` }
          }
        }
      }));
    } catch (emailError) {
      console.log('Email sending failed (SES not configured):', emailError.message);
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

async function generateInvoicePDF(transaction, company) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
    doc.moveDown();

    // Company details
    doc.fontSize(12).text(`From: ${company.legalName}`, { continued: false });
    doc.fontSize(10).text(`GSTIN: ${company.gstin}`);
    doc.text(`${company.address}`);
    doc.text(`${company.city}, ${company.state} - ${company.postalCode}`);
    doc.moveDown();

    // Customer details
    doc.fontSize(12).text(`To: ${transaction.companyName || transaction.customerEmail}`);
    if (transaction.gstin) {
      doc.fontSize(10).text(`GSTIN: ${transaction.gstin}`);
    }
    doc.text(`${transaction.billingAddress}`);
    doc.text(`${transaction.billingCity}, ${transaction.billingState} - ${transaction.billingPostalCode}`);
    doc.moveDown();

    // Invoice details
    doc.fontSize(10);
    doc.text(`Invoice #: INV-${transaction.transactionId}`);
    doc.text(`Date: ${new Date(transaction.createdAt).toLocaleDateString('en-IN')}`);
    doc.moveDown();

    // Line items
    doc.fontSize(12).text('Description: AWS Solution Finder Pro Subscription');
    doc.fontSize(10).text(`HSN/SAC: ${company.hsnSacCode}`);
    doc.moveDown();

    // Amounts
    doc.text(`Base Amount: ₹${transaction.baseAmount.toFixed(2)}`);
    if (transaction.gstAmount > 0) {
      doc.text(`GST @ ${transaction.gstRate}%: ₹${transaction.gstAmount.toFixed(2)}`);
    }
    doc.moveDown();
    doc.fontSize(14).text(`Total Amount: ₹${transaction.totalAmount.toFixed(2)}`, { underline: true });

    doc.end();
  });
}
