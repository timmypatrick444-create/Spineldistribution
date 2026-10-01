import { jsPDF } from 'jspdf';
import { Order, SubmittedQuote } from '../types';

const SPINEL_LOGO_URL = 'https://res.cloudinary.com/bmv4hvtk/image/upload/v1790454463/Spinel_Logo.png';

export interface LoadedImageInfo {
  dataUrl: string;
  width: number;
  height: number;
  aspect: number;
}

function formatInvoiceDate(dateInput?: string | Date): string {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return 'September 27, 2026';
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return 'September 27, 2026';
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getImageDimensionsFromDataUrl(dataUrl: string): Promise<{ width: number; height: number; aspect: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width || 100;
      const height = img.naturalHeight || img.height || 100;
      resolve({ width, height, aspect: width / (height || 1) });
    };
    img.onerror = () => {
      resolve({ width: 100, height: 100, aspect: 1 });
    };
    img.src = dataUrl;
  });
}

async function loadImageData(url: string): Promise<LoadedImageInfo | null> {
  if (!url) return null;

  // 1. Try direct fetch
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      const dims = await getImageDimensionsFromDataUrl(dataUrl);
      return { dataUrl, ...dims };
    }
  } catch {
    // direct fetch blocked by CORS or network, proceed to proxy
  }

  // 2. Try server proxy endpoint
  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      const dims = await getImageDimensionsFromDataUrl(dataUrl);
      return { dataUrl, ...dims };
    }
  } catch {
    // proxy failed, proceed to canvas
  }

  // 3. Fallback to Image element with canvas
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = img.naturalWidth || img.width || 100;
          const height = img.naturalHeight || img.height || 100;
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            resolve({ dataUrl, width, height, aspect: width / (height || 1) });
            return;
          }
        } catch {
          // ignore canvas taint
        }
        resolve(null);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

function drawItemPlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number, name: string) {
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(x, y, w, h, 1, 1, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(x, y, w, h, 1, 1, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const initials = (name || 'SP').substring(0, 2).toUpperCase();
  doc.text(initials, x + w / 2, y + h / 2 + 2, { align: 'center' });
}

export async function downloadInvoicePDF(order: Order) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 18;

  // Pre-load logo and item images
  const [logoInfo, ...itemImageInfos] = await Promise.all([
    loadImageData(SPINEL_LOGO_URL),
    ...order.items.map(item => loadImageData(item.image))
  ]);

  // Header Banner - Height 32mm for high-impact enterprise visual
  doc.setFillColor(19, 25, 33); // Dark navy #131921
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Spinel Distribution Logo - Preserving natural aspect ratio without shrinking or distortion
  if (logoInfo && logoInfo.dataUrl) {
    try {
      const maxLogoW = 60;
      const maxLogoH = 16;
      const aspect = logoInfo.aspect && logoInfo.aspect > 0 ? logoInfo.aspect : 4.263;
      let logoW = maxLogoW;
      let logoH = logoW / aspect;
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = logoH * aspect;
      }

      const format = logoInfo.dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(logoInfo.dataUrl, format, margin, 7.5, logoW, logoH);
    } catch {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SPINEL DISTRIBUTION', margin, 18);
    }
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SPINEL DISTRIBUTION', margin, 18);
  }

  // Right Side: Official Commercial Invoice with order number and date
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Official Commercial Invoice', pageWidth - margin, 12, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(order.orderNumber, pageWidth - margin, 17.5, { align: 'right' });

  doc.setTextColor(254, 189, 105);
  doc.text(formatInvoiceDate(order.createdAt), pageWidth - margin, 23, { align: 'right' });

  y = 40;

  // Order & Customer Details Grid
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED & DELIVERED TO:', margin, y);
  doc.text('ORDER & PAYMENT SUMMARY:', pageWidth / 2 + 8, y);

  y += 5.5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const customerLines = [
    order.customerName,
    order.shippingAddress.companyName ? `Company: ${order.shippingAddress.companyName}` : '',
    order.shippingAddress.streetAddress,
    `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode || ''}`,
    `Country: ${order.shippingAddress.country}`,
    `Email: ${order.customerEmail}`,
    `Phone: ${order.shippingAddress.phone}`
  ].filter(Boolean);

  let custY = y;
  for (const line of customerLines) {
    doc.text(line, margin, custY);
    custY += 4.2;
  }

  const isPaid = order.paymentStatus === 'paid' || order.status === 'completed';
  const displayStatus = isPaid ? 'COMPLETED' : 'PENDING';

  const orderLines = [
    `Invoice Ref: ${order.orderNumber}`,
    `Issue Date: ${formatInvoiceDate(order.createdAt)}`,
    `Payment Status: ${displayStatus}`,
    `Payment Gateway: ${order.paymentMethod === 'paystack' ? 'Paystack Live Gateway' : order.paymentMethod.toUpperCase()}`,
    order.paymentReference ? `Transaction Ref: ${order.paymentReference}` : 'Transaction Ref: Unassigned (Pending)',
    `Shipping & Handling: 100% FREE (Enterprise Dispatch)`
  ].filter(Boolean);

  let ordY = y;
  for (const line of orderLines) {
    doc.text(line, pageWidth / 2 + 8, ordY);
    ordY += 4.2;
  }

  y = Math.max(custY, ordY) + 7;

  // Table Header - Well-structured with Item Image, Description, SKU / Model (wrapping enabled), QTY, Price, Total
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, pageWidth - (margin * 2), 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.text('ITEM', margin + 3, y + 5);
  doc.text('DESCRIPTION & SPECIFICATION', margin + 20, y + 5);
  doc.text('SKU / MODEL', margin + 96, y + 5);
  doc.text('QTY', margin + 132, y + 5, { align: 'center' });
  doc.text('UNIT (USD)', margin + 155, y + 5, { align: 'right' });
  doc.text('TOTAL (USD)', pageWidth - margin - 3, y + 5, { align: 'right' });

  y += 8.5;

  // Table Rows - With product thumbnail image, text wrapped SKU and description, and proper height
  order.items.forEach((item, index) => {
    const skuMaxW = 28;
    const splitSku = doc.splitTextToSize(item.sku || 'N/A', skuMaxW);

    const descMaxW = 72;
    const cleanName = item.name.length > 55 ? item.name.substring(0, 52) + '...' : item.name;
    const splitName = doc.splitTextToSize(cleanName, descMaxW);

    const rowHeight = Math.max(17, Math.max(splitSku.length, splitName.length + 1) * 4.2 + 6);

    // Check if new page needed
    if (y + rowHeight > 255) {
      doc.addPage();
      y = 20;

      // Repeat Table Header
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y, pageWidth - (margin * 2), 7.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text('ITEM', margin + 3, y + 5);
      doc.text('DESCRIPTION & SPECIFICATION', margin + 20, y + 5);
      doc.text('SKU / MODEL', margin + 96, y + 5);
      doc.text('QTY', margin + 132, y + 5, { align: 'center' });
      doc.text('UNIT (USD)', margin + 155, y + 5, { align: 'right' });
      doc.text('TOTAL (USD)', pageWidth - margin - 3, y + 5, { align: 'right' });
      y += 8.5;
    }

    // Row alternating background
    if (index % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y - 1, pageWidth - (margin * 2), rowHeight, 'F');
    }

    // Thumbnail Product Image - Correctly displayed and framed
    const itemImg = itemImageInfos[index];
    const boxSize = 14;
    if (itemImg && itemImg.dataUrl) {
      try {
        let imgW = boxSize;
        let imgH = boxSize;
        if (itemImg.aspect > 1) {
          imgH = boxSize / itemImg.aspect;
        } else if (itemImg.aspect < 1) {
          imgW = boxSize * itemImg.aspect;
        }
        const imgX = margin + 3 + (boxSize - imgW) / 2;
        const imgY = y + 1 + (boxSize - imgH) / 2;

        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin + 3, y + 1, boxSize, boxSize, 1, 1, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin + 3, y + 1, boxSize, boxSize, 1, 1, 'S');

        const format = itemImg.dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(itemImg.dataUrl, format, imgX, imgY, imgW, imgH);
      } catch (err) {
        console.warn('Could not render image to PDF', err);
        drawItemPlaceholder(doc, margin + 3, y + 1, boxSize, boxSize, item.name);
      }
    } else {
      drawItemPlaceholder(doc, margin + 3, y + 1, boxSize, boxSize, item.name);
    }

    // Name & Category
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(splitName, margin + 20, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const catY = y + 4.5 + splitName.length * 4;
    doc.text(item.category || 'Hardware Equipment', margin + 20, catY);

    // SKU / MODEL with auto-wrapping so it never overflows into QTY cell
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(splitSku, margin + 96, y + 4.5);

    // Qty
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(String(item.quantity), margin + 132, y + 5.5, { align: 'center' });

    // Unit Price (USD)
    doc.text(`$${item.priceUSD.toFixed(2)}`, margin + 155, y + 5.5, { align: 'right' });

    // Total (USD)
    doc.setFont('helvetica', 'bold');
    doc.text(`$${(item.priceUSD * item.quantity).toFixed(2)}`, pageWidth - margin - 3, y + 5.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // Row divider
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + rowHeight - 1, pageWidth - margin, y + rowHeight - 1);

    y += rowHeight;
  });

  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Summary box - TOTAL AMOUNT is identical to Subtotal, Shipping is FREE, no extra fees
  const summaryX = pageWidth - margin - 88;
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Subtotal (USD):', summaryX, y);
  doc.text(`$${order.subtotalUSD.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
  y += 5.5;

  doc.text('Shipping & Handling:', summaryX, y);
  doc.setTextColor(22, 101, 52); // emerald green
  doc.setFont('helvetica', 'bold');
  doc.text('FREE (100% Waived)', pageWidth - margin, y, { align: 'right' });
  y += 6.5;

  // Grand Total in USD and NGN - Total is strictly equal to Subtotal
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(summaryX - 4, y - 1, 92, 15, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9);
  doc.text('TOTAL AMOUNT:', summaryX, y + 5);
  doc.text(`$${order.subtotalUSD.toFixed(2)}`, pageWidth - margin - 2, y + 5, { align: 'right' });

  const totalNaira = Math.round(order.subtotalUSD * (order.exchangeRateUsed || 1580));
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Total in Naira: ₦${totalNaira.toLocaleString()}`, summaryX, y + 11);

  y += 24;

  // Footer & Terms
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for choosing SPINEL DISTRIBUTION. For support or warranty claims, contact sales@spineldistribution.com', margin, y);
  y += 4;
  doc.text('All products carry official international manufacturer warranties. Commercial return window is 30 days from dispatch.', margin, y);

  // Save PDF
  doc.save(`Spinel_Invoice_${order.orderNumber}.pdf`);
}

export async function downloadQuotationPDF(quote: SubmittedQuote) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 18;

  // Pre-load logo and product image
  const [logoInfo, productImgInfo] = await Promise.all([
    loadImageData(SPINEL_LOGO_URL),
    quote.product?.image ? loadImageData(quote.product.image) : Promise.resolve(null)
  ]);

  // Header Banner - Height 32mm
  doc.setFillColor(19, 25, 33); // Dark navy #131921
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Replace SPINEL DISTRIBUTION heading with Spinel Logo preserving true proportions
  if (logoInfo && logoInfo.dataUrl) {
    try {
      const maxLogoW = 60;
      const maxLogoH = 16;
      const aspect = logoInfo.aspect && logoInfo.aspect > 0 ? logoInfo.aspect : 4.263;
      let logoW = maxLogoW;
      let logoH = logoW / aspect;
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = logoH * aspect;
      }

      const format = logoInfo.dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(logoInfo.dataUrl, format, margin, 7.5, logoW, logoH);
    } catch {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SPINEL DISTRIBUTION', margin, 18);
    }
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SPINEL DISTRIBUTION', margin, 18);
  }

  // Document Title & Reference
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ENTERPRISE RFQ / QUOTATION', pageWidth - margin, 12, { align: 'right' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ref: ${quote.quoteId}`, pageWidth - margin, 17.5, { align: 'right' });
  doc.setTextColor(254, 189, 105);
  doc.text(`Date: ${quote.date || formatInvoiceDate(new Date())}`, pageWidth - margin, 23, { align: 'right' });

  y = 38;

  // Status Banner
  let statusBg: [number, number, number] = [254, 243, 199]; // amber
  let statusText: [number, number, number] = [180, 83, 9];
  if (quote.status === 'Approved') {
    statusBg = [220, 252, 231];
    statusText = [22, 101, 52];
  } else if (quote.status === 'Quoted') {
    statusBg = [219, 234, 254];
    statusText = [30, 64, 175];
  } else if (quote.status === 'Declined') {
    statusBg = [254, 226, 226];
    statusText = [153, 27, 27];
  }

  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(statusText[0], statusText[1], statusText[2]);
  doc.text(`RFQ STATUS: ${String(quote.status || 'UNDER REVIEW').toUpperCase()}`, margin + 5, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Authorized Reference ID: ${quote.quoteId}`, pageWidth - margin - 60, y + 6.5);

  y += 16;

  // Two Column Grid: Client Details & Project Parameters
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('CLIENT & ENTERPRISE DETAILS:', margin, y);
  doc.text('PROJECT & LOGISTICS PARAMETERS:', pageWidth / 2 + 5, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const clientInfo = [
    `Company: ${quote.companyName || 'Private Enterprise / Client'}`,
    `Contact Person: ${quote.contactName}`,
    `Email: ${quote.email}`,
    `Phone: ${quote.phone}`,
    `Location: ${quote.location || 'Federal Republic of Nigeria / West Africa'}`
  ];

  let leftY = y;
  for (const line of clientInfo) {
    doc.text(line, margin, leftY);
    leftY += 4.8;
  }

  const projectInfo = [
    `Timeline: ${quote.projectTimeline || 'Standard (1-2 weeks)'}`,
    `Preferred Currency: ${quote.currency || 'USD'}`,
    `Shipping & Handling: FREE (Enterprise Dispatch Included)`,
    `On-Site Installation: ${quote.needsInstallation ? 'YES (Deployment Engineers Required)' : 'NO (Supply Only)'}`,
    `Partner Tier Discount: ${quote.needsPartnerDiscount ? 'YES (Volume / Partner Tier Requested)' : 'Standard Wholesale'}`
  ];

  let rightY = y;
  for (const line of projectInfo) {
    doc.text(line, pageWidth / 2 + 5, rightY);
    rightY += 4.8;
  }

  y = Math.max(leftY, rightY) + 6;

  // Hardware Table
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  doc.text('HARDWARE DESCRIPTION', margin + 4, y + 5.5);
  doc.text('BRAND', margin + 92, y + 5.5);
  doc.text('SKU / MODEL', margin + 130, y + 5.5);
  doc.text('QTY', margin + 165, y + 5.5);

  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  if (quote.product) {
    const skuMaxW = 32;
    const splitSku = doc.splitTextToSize(quote.product.sku || 'N/A', skuMaxW);

    const descMaxW = 68;
    const cleanTitle = quote.product.name.length > 50 ? quote.product.name.substring(0, 47) + '...' : quote.product.name;
    const splitName = doc.splitTextToSize(cleanTitle, descMaxW);

    const rowHeight = Math.max(17, Math.max(splitSku.length, splitName.length + 1) * 4.2 + 6);
    doc.setFillColor(249, 250, 251);
    doc.rect(margin, y - 1, pageWidth - (margin * 2), rowHeight, 'F');

    // Thumbnail Item Image in Hardware Description section
    const boxSize = 14;
    if (productImgInfo && productImgInfo.dataUrl) {
      try {
        let imgW = boxSize;
        let imgH = boxSize;
        if (productImgInfo.aspect > 1) {
          imgH = boxSize / productImgInfo.aspect;
        } else if (productImgInfo.aspect < 1) {
          imgW = boxSize * productImgInfo.aspect;
        }
        const imgX = margin + 4 + (boxSize - imgW) / 2;
        const imgY = y + 1 + (boxSize - imgH) / 2;

        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin + 4, y + 1, boxSize, boxSize, 1, 1, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin + 4, y + 1, boxSize, boxSize, 1, 1, 'S');

        const format = productImgInfo.dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(productImgInfo.dataUrl, format, imgX, imgY, imgW, imgH);
      } catch (err) {
        console.warn('Error adding quote product image to PDF', err);
        drawItemPlaceholder(doc, margin + 4, y + 1, boxSize, boxSize, quote.product.name);
      }
    } else {
      drawItemPlaceholder(doc, margin + 4, y + 1, boxSize, boxSize, quote.product.name);
    }

    const textX = margin + 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(splitName, textX, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const catY = y + 4.5 + splitName.length * 4;
    doc.text(`Category: ${quote.product.category}`, textX, catY);

    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(quote.product.brand || 'Enterprise Grade', margin + 92, y + 6.5);

    // SKU with text wrapping
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.text(splitSku, margin + 130, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(19, 25, 33);
    doc.setFontSize(8.5);
    doc.text(`${quote.quantity} units`, margin + 165, y + 6.5);

    y += rowHeight + 4;
  } else {
    doc.text('Multi-System Enterprise Procurement Bill of Quantities', margin + 4, y + 5);
    doc.text(`${quote.quantity} units`, margin + 165, y + 5);
    y += 12;
  }

  // Technical Scope & Notes
  if (quote.notes) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('CLIENT SPECIFICATIONS & SCOPE OF REQUIREMENT:', margin, y);
    y += 5;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    const splitNotes = doc.splitTextToSize(`"${quote.notes}"`, pageWidth - (margin * 2) - 10);
    const boxHeight = Math.max(14, splitNotes.length * 4.5 + 6);

    doc.roundedRect(margin, y, pageWidth - (margin * 2), boxHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(splitNotes, margin + 5, y + 5);

    y += boxHeight + 8;
  } else {
    y += 4;
  }

  // Terms & Conditions Block
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('COMMERCIAL PROCUREMENT CONDITIONS:', margin, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const terms = [
    '1. Quotation Validity: Official proforma quotations derived from this RFQ remain valid for 14 calendar days.',
    '2. Exchange Rate Benchmark: International prices pegged to USD and settled in NGN or USD via official bank wire.',
    '3. Manufacturer Warranty: All enterprise items are covered by standard 1 to 3-year OEM manufacturer replacement warranties.',
    '4. Logistics & Clearance: 100% Free Door-to-Door enterprise delivery with technical inspection certificate provided upon dispatch.'
  ];
  for (const term of terms) {
    doc.text(term, margin, y);
    y += 4;
  }

  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Footer Seal & Contact
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(19, 25, 33);
  doc.text('SPINEL DISTRIBUTION ENTERPRISE PROCUREMENT DESK', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Email: rfq@spineldistribution.com | Technical Support: sales@spineldistribution.com | www.spineldistribution.com', margin, y + 4);

  // Save PDF
  doc.save(`Spinel_RFQ_${quote.quoteId}.pdf`);
}
