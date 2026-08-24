import { query } from '../db/index.js';
import { StockEngine } from '../services/stockEngine.js';
import { logAudit } from '../middleware/auditLogger.js';

// --- PRINTING VENDORS ---
export async function getPrintingVendors(req, res) {
  try {
    const result = await query(`SELECT * FROM printing_vendors WHERE company_id = $1 ORDER BY id ASC`, [req.user.company_id]);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch printing vendors.' });
  }
}

export async function createPrintingVendor(req, res) {
  try {
    const companyId = req.user.company_id;
    const { name, company_name, phone, email, address, rate_per_unit, notes } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Vendor name is required.' });
    }

    const code = `PRT-${Date.now().toString().slice(-4)}`;
    const rate = parseFloat(rate_per_unit || 0);

    const result = await query(
      `INSERT INTO printing_vendors (company_id, code, name, company_name, phone, email, address, rate_per_unit, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [companyId, code, name.trim(), company_name || null, phone || null, email || null, address || null, rate, notes || null]
    );

    return res.status(201).json({ success: true, message: 'Printing vendor created', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// --- PRINT JOBS (SEND FABRIC) ---
export async function getPrintingJobs(req, res) {
  try {
    const { vendor_id, status } = req.query;
    let sql = `
      SELECT 
        pj.id, pj.job_number, pj.challan_number, pj.vendor_id, pj.from_warehouse_id,
        pj.sent_date, pj.expected_return_date, pj.estimated_printing_cost,
        pj.transport_cost, pj.status, pj.notes, pj.created_by, pj.created_at,
        pv.name as vendor_name,
        pv.company_name as vendor_company,
        w.name as from_warehouse_name,
        u.name as created_by_name,
        COUNT(pji.id) as total_items,
        COALESCE(SUM(pji.sent_quantity), 0) as total_sent_qty,
        COALESCE(SUM(pji.received_quantity), 0) as total_received_qty,
        COALESCE(SUM(pji.pending_quantity), 0) as total_pending_qty
      FROM printing_jobs pj
      JOIN printing_vendors pv ON pj.vendor_id = pv.id
      LEFT JOIN warehouses w ON pj.from_warehouse_id = w.id
      LEFT JOIN users u ON pj.created_by = u.id
      LEFT JOIN printing_job_items pji ON pj.id = pji.job_id
      WHERE 1=1
    `;
    const params = [];

    if (vendor_id) {
      params.push(vendor_id);
      sql += ` AND pj.vendor_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND pj.status = $${params.length}`;
    }

    sql += ` GROUP BY pj.id, pj.job_number, pj.challan_number, pj.vendor_id, pj.from_warehouse_id,
      pj.sent_date, pj.expected_return_date, pj.estimated_printing_cost, pj.transport_cost,
      pj.status, pj.notes, pj.created_by, pj.created_at,
      pv.name, pv.company_name, w.name, u.name ORDER BY pj.sent_date DESC, pj.id DESC`;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch printing jobs.' });
  }
}

export async function getPrintingJobById(req, res) {
  try {
    const { id } = req.params;
    const jobRes = await query(
      `SELECT pj.*, pv.name as vendor_name, pv.company_name as vendor_company, pv.phone as vendor_phone,
              w.name as from_warehouse_name, u.name as created_by_name
       FROM printing_jobs pj
       JOIN printing_vendors pv ON pj.vendor_id = pv.id
       LEFT JOIN warehouses w ON pj.from_warehouse_id = w.id
       LEFT JOIN users u ON pj.created_by = u.id
       WHERE pj.id = $1`,
      [id]
    );

    if (jobRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Printing job not found.' });
    }

    const itemsRes = await query(
      `SELECT pji.*, i.name as item_name, i.item_code, u.symbol as unit_symbol
       FROM printing_job_items pji
       JOIN items i ON pji.item_id = i.id
       LEFT JOIN units u ON i.unit_id = u.id
       WHERE pji.job_id = $1`,
      [id]
    );

    const receiptsRes = await query(
      `SELECT pr.*, u.name as created_by_name, w.name as warehouse_name
       FROM printing_receipts pr
       LEFT JOIN users u ON pr.created_by = u.id
       LEFT JOIN warehouses w ON pr.to_warehouse_id = w.id
       WHERE pr.job_id = $1
       ORDER BY pr.receive_date DESC`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...jobRes.rows[0],
        items: itemsRes.rows,
        receipts: receiptsRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createPrintingJob(req, res) {
  try {
    const companyId = req.user.company_id;
    const {
      vendor_id,
      from_warehouse_id,
      sent_date,
      expected_return_date,
      challan_number,
      transport_cost,
      notes,
      items // Array of { item_id, design_name, sent_quantity, rate_per_unit }
    } = req.body;

    if (!vendor_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Vendor and at least one fabric item are required.' });
    }

    const jobNum = `PRT-JOB-${Date.now().toString().slice(-5)}`;
    const challan = challan_number || `CHL-${Date.now().toString().slice(-5)}`;
    const fromWh = from_warehouse_id || 1; // Default Main Warehouse
    const sDate = sent_date || new Date().toISOString().split('T')[0];
    const transCost = parseFloat(transport_cost || 0);

    let estimatedTotalCost = 0;
    let totalSentMeters = 0;

    for (const it of items) {
      const q = parseFloat(it.sent_quantity || 0);
      const r = parseFloat(it.rate_per_unit || 0);
      estimatedTotalCost += (q * r);
      totalSentMeters += q;
    }

    // 1. Create Job Header
    const jobRes = await query(
      `INSERT INTO printing_jobs 
      (company_id, job_number, challan_number, vendor_id, from_warehouse_id, sent_date, expected_return_date, estimated_printing_cost, transport_cost, status, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Sent', $10, $11)
       RETURNING *`,
          [companyId, jobNum, challan, vendor_id, fromWh, sDate, expected_return_date || null, estimatedTotalCost, transCost, notes || null, req.user?.id]
    );
    const job = jobRes.rows[0];

    // 2. Insert items and move stock: Main Warehouse (1) -> Printing Vendor Stock (2)
    for (const it of items) {
      const sentQty = parseFloat(it.sent_quantity);
      const rate = parseFloat(it.rate_per_unit);
      const cost = sentQty * rate;

      await query(
        `INSERT INTO printing_job_items (company_id, job_id, item_id, design_name, sent_quantity, received_quantity, wastage_quantity, damage_quantity, pending_quantity, rate_per_unit, estimated_cost)
         VALUES ($1, $2, $3, $4, $5, 0, 0, 0, $5, $6, $7)`,
        [companyId, job.id, it.item_id, it.design_name, sentQty, rate, cost]
      );

      // Deduct from Main Warehouse and add to Printing Vendor Floor (WH 2)
      await StockEngine.recordMovement({
        companyId,
        itemId: it.item_id,
        movementType: 'Sent for Printing',
        quantity: sentQty,
        fromWarehouseId: fromWh,
        toWarehouseId: 2, // Printing Vendor Floor
        referenceType: 'Printing Job',
        referenceId: job.id,
        referenceNumber: jobNum,
        unitCost: rate,
        notes: `Fabric dispatched to printer for design: ${it.design_name}`,
        userId: req.user?.id,
        userName: req.user?.name
      });
    }

    // 3. Update vendor metrics
    await query(
      `UPDATE printing_vendors 
       SET total_sent = total_sent + $1, pending_fabric = pending_fabric + $1 
       WHERE id = $2`,
      [totalSentMeters, vendor_id]
    );

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CREATE',
      module: 'PRINTING',
      recordId: job.id,
      referenceNumber: jobNum,
      details: `Dispatched ${totalSentMeters}m fabric for printing (Challan: ${challan})`
    });

    return res.status(201).json({
      success: true,
      message: 'Print job dispatched and stock transferred to printer location',
      data: job
    });
  } catch (err) {
    console.error('Create Print Job Error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
}

// --- PRINT RECEIVE SYSTEM ---
export async function receivePrintedFabric(req, res) {
  try {
    const companyId = req.user.company_id;
    const {
      job_id,
      to_warehouse_id,
      receive_date,
      transport_charges,
      notes,
      items // Array of { job_item_id, raw_item_id, resulting_item_id, received_quantity, wastage_quantity, damage_quantity, printing_rate }
    } = req.body;

    if (!job_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Print job and received items are required.' });
    }

    // Get Job Details
    const jobRes = await query(`SELECT * FROM printing_jobs WHERE id = $1`, [job_id]);
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Print job not found.' });
    }
    const job = jobRes.rows[0];

    const toWh = to_warehouse_id || 1; // Default Main Warehouse
    const rDate = receive_date || new Date().toISOString().split('T')[0];
    const transCharges = parseFloat(transport_charges || 0);
    const receiptNum = `PRT-REC-${Date.now().toString().slice(-5)}`;

    let totalPrintingCharges = 0;
    let totalReceivedThisBatch = 0;
    let totalWastageThisBatch = 0;

    for (const it of items) {
      const recQty = parseFloat(it.received_quantity || 0);
      const prtRate = parseFloat(it.printing_rate || 0);
      totalPrintingCharges += (recQty * prtRate);
      totalReceivedThisBatch += recQty;
      totalWastageThisBatch += parseFloat(it.wastage_quantity || 0) + parseFloat(it.damage_quantity || 0);
    }

    const totalCharges = totalPrintingCharges + transCharges;

    // 1. Create Receipt Header
    const receiptRes = await query(
      `INSERT INTO printing_receipts (company_id, receipt_number, job_id, vendor_id, to_warehouse_id, receive_date, printing_charges, transport_charges, total_charges, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [companyId, receiptNum, job.id, job.vendor_id, toWh, rDate, totalPrintingCharges, transCharges, totalCharges, notes || null, req.user?.id]
    );
    const receipt = receiptRes.rows[0];

    // 2. Process each received item
    for (const it of items) {
      const recQty = parseFloat(it.received_quantity || 0);
      const wasteQty = parseFloat(it.wastage_quantity || 0);
      const dmgQty = parseFloat(it.damage_quantity || 0);
      const prtRate = parseFloat(it.printing_rate || 0);
      const prtCost = recQty * prtRate;

      // Insert receipt item
      await query(
        `INSERT INTO printing_receipt_items (company_id, receipt_id, job_item_id, raw_item_id, resulting_item_id, received_quantity, wastage_quantity, damage_quantity, printing_rate, printing_cost)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [companyId, receipt.id, it.job_item_id, it.raw_item_id, it.resulting_item_id || it.raw_item_id, recQty, wasteQty, dmgQty, prtRate, prtCost]
      );

      // Update Job Item statistics
      const jobItemRes = await query(`SELECT * FROM printing_job_items WHERE id = $1`, [it.job_item_id]);
      const currentJobItem = jobItemRes.rows[0];
      const newRec = parseFloat(currentJobItem.received_quantity) + recQty;
      const newWaste = parseFloat(currentJobItem.wastage_quantity) + wasteQty;
      const newDmg = parseFloat(currentJobItem.damage_quantity) + dmgQty;
      const sentQty = parseFloat(currentJobItem.sent_quantity);
      const newPending = Math.max(0, sentQty - newRec - newWaste - newDmg);

      await query(
        `UPDATE printing_job_items 
         SET received_quantity = $1, wastage_quantity = $2, damage_quantity = $3, pending_quantity = $4
         WHERE id = $5`,
        [newRec, newWaste, newDmg, newPending, it.job_item_id]
      );

      // Deduct raw fabric from Printer Floor (WH 2)
      const rawDeductQty = recQty + wasteQty + dmgQty;
      if (rawDeductQty > 0) {
        await StockEngine.recordMovement({
          companyId,
          itemId: it.raw_item_id,
          movementType: 'Printed Fabric Received',
          quantity: rawDeductQty,
          fromWarehouseId: 2, // Printer Floor
          toWarehouseId: null,
          referenceType: 'Print Receipt',
          referenceId: receipt.id,
          referenceNumber: receiptNum,
          notes: `Consumed in printing (Good: ${recQty}, Waste: ${wasteQty}, Damage: ${dmgQty})`,
          userId: req.user?.id,
          userName: req.user?.name
        });
      }

      // Add Good printed fabric to Warehouse
      const targetPrintedItem = it.resulting_item_id || it.raw_item_id;
      if (recQty > 0) {
        await StockEngine.recordMovement({
          companyId,
          itemId: targetPrintedItem,
          movementType: 'Printed Fabric Received',
          quantity: recQty,
          fromWarehouseId: null,
          toWarehouseId: toWh,
          referenceType: 'Print Receipt',
          referenceId: receipt.id,
          referenceNumber: receiptNum,
          unitCost: prtRate,
          notes: `Good Printed Fabric received from ${receiptNum}`,
          userId: req.user?.id,
          userName: req.user?.name
        });
      }

      // Route wastage to Wastage Location (WH 5)
      if (wasteQty + dmgQty > 0) {
        await StockEngine.recordMovement({
          companyId,
          itemId: it.raw_item_id,
          movementType: 'Wastage',
          quantity: wasteQty + dmgQty,
          fromWarehouseId: null,
          toWarehouseId: 5, // Wastage WH
          referenceType: 'Print Wastage',
          referenceId: receipt.id,
          referenceNumber: receiptNum,
          notes: `Printing process wastage/damages`,
          userId: req.user?.id,
          userName: req.user?.name
        });
      }
    }

    // 3. Check overall job status: Completed or Partial Received
    const pendingCheck = await query(
      `SELECT COALESCE(SUM(pending_quantity), 0) as total_pending FROM printing_job_items WHERE job_id = $1`,
      [job.id]
    );
    const totalRemaining = parseFloat(pendingCheck.rows[0]?.total_pending || 0);
    const newStatus = totalRemaining <= 0 ? 'Completed' : 'Partial Received';

    await query(`UPDATE printing_jobs SET status = $1 WHERE id = $2`, [newStatus, job.id]);

    // 4. Update Vendor Balances & Billing
    await query(
      `UPDATE printing_vendors 
       SET total_received = total_received + $1, 
           pending_fabric = GREATEST(0, pending_fabric - $2),
           total_bills = total_bills + $3,
           pending_bills = pending_bills + $3
       WHERE id = $4`,
      [totalReceivedThisBatch, (totalReceivedThisBatch + totalWastageThisBatch), totalCharges, job.vendor_id]
    );

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'UPDATE',
      module: 'PRINTING',
      recordId: receipt.id,
      referenceNumber: receiptNum,
      details: `Received ${totalReceivedThisBatch}m printed fabric. Status now: ${newStatus}`
    });

    return res.status(201).json({
      success: true,
      message: `Printed fabric received successfully. Job Status: ${newStatus}`,
      data: receipt
    });
  } catch (err) {
    console.error('Receive Printed Fabric Error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function getPrinterReports(req, res) {
  try {
    const result = await query(
      `SELECT 
        pv.id,
        pv.code,
        pv.name,
        pv.company_name,
        pv.rate_per_unit,
        pv.total_sent,
        pv.total_received,
        pv.pending_fabric,
        pv.total_bills,
        pv.paid_amount,
        pv.pending_bills,
        COUNT(DISTINCT pj.id) as total_jobs
       FROM printing_vendors pv
       LEFT JOIN printing_jobs pj ON pv.id = pj.vendor_id
       GROUP BY pv.id, pv.code, pv.name, pv.company_name, pv.rate_per_unit, pv.total_sent, pv.total_received, pv.pending_fabric, pv.total_bills, pv.paid_amount, pv.pending_bills
       ORDER BY pv.pending_fabric DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
