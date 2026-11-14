/**
 * Rental Ledger PWA - Client-Side Offline Database Engine
 * Implements the full LedgerAPI JSON-RPC bridge using browser LocalStorage/IndexedDB.
 * Ensures 100% parity with the Python SQLite desktop backend on iPhone, iPad & Mac/Windows browsers.
 */

(function() {
  const STORAGE_KEY = "rental_ledger_universal_db_v5";
  const PREFS_KEY = "rental_ledger_preferences_v2";

  class PWAStorageEngine {
    constructor() {
      this.data = null;
      this.prefs = null;
      this.initPromise = this._initialize();
    }

    async _initialize() {
      // 1. Load preferences
      const savedPrefs = localStorage.getItem(PREFS_KEY);
      if (savedPrefs) {
        try {
          this.prefs = JSON.parse(savedPrefs);
        } catch (e) {
          console.error("Failed to parse saved preferences:", e);
        }
      }
      if (!this.prefs) {
        this.prefs = {
          theme: "dark",
          accent_color: "#22D3EE",
          gradient_css: "linear-gradient(135deg, #22D3EE 0%, #10B981 100%)",
          gradient_color: "#10B981",
          reduced_motion: false
        };
      }

      // 2. Load database
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          this.data = JSON.parse(savedData);
        } catch (e) {
          console.error("Failed to parse saved database:", e);
        }
      }

      // If no database in local storage, attempt to seed from seed_data.json
      if (!this.data || !this.data.buildings || this.data.buildings.length === 0) {
        try {
          const resp = await fetch("./seed_data.json");
          if (resp.ok) {
            this.data = await resp.json();
            this._saveData();
            console.log("[PWA Storage] Successfully seeded initial database from seed_data.json");
          }
        } catch (err) {
          console.warn("[PWA Storage] Could not fetch seed_data.json:", err);
        }
      }

      if (!this.data) {
        this.data = {
          version: 5,
          app: "Rental Ledger (Universal)",
          exportedAt: new Date().toISOString(),
          compatiblePlatforms: ["iOS", "Android", "Windows", "macOS", "Web"],
          buildings: [],
          rooms: [],
          monthly_records: [],
          payments: [],
          utility_bills: [],
          deleted_monthly_records: []
        };
      }
      return true;
    }

    _saveData() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.error("[PWA Storage] LocalStorage write error:", e);
      }
    }

    _savePrefs() {
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
      } catch (e) {
        console.error("[PWA Storage] LocalStorage write error (prefs):", e);
      }
    }

    // -------------------------------------------------------------------------
    // Preferences Endpoints
    // -------------------------------------------------------------------------

    async get_preferences() {
      await this.initPromise;
      return { ...this.prefs };
    }

    async save_preferences(newPrefs) {
      await this.initPromise;
      this.prefs = { ...this.prefs, ...newPrefs };
      this._savePrefs();
      return { success: true };
    }

    // -------------------------------------------------------------------------
    // Building Endpoints
    // -------------------------------------------------------------------------

    async get_buildings() {
      await this.initPromise;
      return [...(this.data.buildings || [])];
    }

    async create_building(name, address, color_hex) {
      await this.initPromise;
      const bldgs = this.data.buildings || [];
      const newId = bldgs.length > 0 ? Math.max(...bldgs.map(b => b.id || 0)) + 1 : 1;
      const newBldg = {
        id: newId,
        name: (name || "").trim(),
        address: (address || "").trim(),
        colorHex: color_hex || "#22D3EE"
      };
      bldgs.push(newBldg);
      this.data.buildings = bldgs;
      this._saveData();
      return { success: true, id: newId };
    }

    async update_building(id, name, address, color_hex) {
      await this.initPromise;
      const bldg = (this.data.buildings || []).find(b => b.id === Number(id));
      if (!bldg) return { success: false, error: "Property not found" };
      bldg.name = (name || "").trim();
      bldg.address = (address || "").trim();
      bldg.colorHex = color_hex || bldg.colorHex || "#22D3EE";
      this._saveData();
      return { success: true };
    }

    async delete_building(id) {
      await this.initPromise;
      const bId = Number(id);
      const roomsInBldg = (this.data.rooms || []).filter(r => r.buildingId === bId);
      if (roomsInBldg.length > 0) {
        return { success: false, error: `Cannot delete: property contains ${roomsInBldg.length} rooms.` };
      }
      this.data.buildings = (this.data.buildings || []).filter(b => b.id !== bId);
      this._saveData();
      return { success: true };
    }

    // -------------------------------------------------------------------------
    // Room Endpoints
    // -------------------------------------------------------------------------

    async get_rooms(building_id) {
      await this.initPromise;
      let rooms = this.data.rooms || [];
      if (building_id !== null && building_id !== undefined) {
        rooms = rooms.filter(r => r.buildingId === Number(building_id));
      }
      return rooms.map(r => ({
        id: r.id,
        buildingId: r.buildingId,
        roomNumber: r.roomNumber,
        status: r.status,
        moveInDay: r.moveInDay || 1,
        advanceReceived: r.advanceReceived || 0,
        agreedRent: Number(r.agreedRent || 0),
        defaultMeterRate: Number(r.defaultMeterRate || 10),
        lendedDate: r.lendedDate || "",
        securityDepositReceived: Boolean(r.securityDepositReceived),
        securityDepositAmount: Number(r.securityDepositAmount || 0),
        tenant: (r.tenantName) ? {
          name: r.tenantName,
          phone: r.tenantPhone || "",
          notes: r.notes || ""
        } : null
      }));
    }

    async save_room(room_id, building_id, room_number, status, agreed_rent, default_meter_rate,
                    advance_received, move_in_day, tenant_name, tenant_phone, notes,
                    lended_date, security_deposit_received, security_deposit_amount) {
      await this.initPromise;
      const rooms = this.data.rooms || [];
      let savedId = Number(room_id);

      if (savedId) {
        const r = rooms.find(x => x.id === savedId);
        if (r) {
          r.buildingId = Number(building_id);
          r.roomNumber = (room_number || "").trim();
          r.status = status;
          r.agreedRent = Number(agreed_rent) || 0;
          r.defaultMeterRate = Number(default_meter_rate) || 10;
          r.advanceReceived = advance_received ? 1 : 0;
          r.moveInDay = Number(move_in_day) || 1;
          r.tenantName = (tenant_name || "").trim();
          r.tenantPhone = (tenant_phone || "").trim();
          r.notes = (notes || "").trim();
          r.lendedDate = lended_date || "";
          r.securityDepositReceived = security_deposit_received ? 1 : 0;
          r.securityDepositAmount = Number(security_deposit_amount) || 0;
        }
      } else {
        savedId = rooms.length > 0 ? Math.max(...rooms.map(x => x.id || 0)) + 1 : 1;
        rooms.push({
          id: savedId,
          buildingId: Number(building_id),
          roomNumber: (room_number || "").trim(),
          status: status,
          agreedRent: Number(agreed_rent) || 0,
          defaultMeterRate: Number(default_meter_rate) || 10,
          advanceReceived: advance_received ? 1 : 0,
          moveInDay: Number(move_in_day) || 1,
          tenantName: (tenant_name || "").trim(),
          tenantPhone: (tenant_phone || "").trim(),
          notes: (notes || "").trim(),
          lendedDate: lended_date || "",
          securityDepositReceived: security_deposit_received ? 1 : 0,
          securityDepositAmount: Number(security_deposit_amount) || 0
        });
      }
      this.data.rooms = rooms;
      this._saveData();
      return { success: true, id: savedId };
    }

    async delete_room(room_id) {
      await this.initPromise;
      const rId = Number(room_id);
      this.data.rooms = (this.data.rooms || []).filter(r => r.id !== rId);
      // Clean associated monthly records and payments
      const recIdsToDelete = (this.data.monthly_records || []).filter(mr => mr.roomId === rId).map(mr => mr.id);
      this.data.monthly_records = (this.data.monthly_records || []).filter(mr => mr.roomId !== rId);
      this.data.payments = (this.data.payments || []).filter(p => !recIdsToDelete.includes(p.recordId));
      this._saveData();
      return { success: true };
    }

    // -------------------------------------------------------------------------
    // Monthly Records & Statements
    // -------------------------------------------------------------------------

    async get_records(building_id, month, year) {
      await this.initPromise;
      const m = Number(month);
      const y = Number(year);
      const bId = (building_id !== null && building_id !== undefined) ? Number(building_id) : null;

      let rooms = this.data.rooms || [];
      if (bId) {
        rooms = rooms.filter(r => r.buildingId === bId);
      }

      const existingRecords = (this.data.monthly_records || []).filter(mr => mr.month === m && mr.year === y);
      const existingRoomIds = new Set(existingRecords.map(mr => mr.roomId));
      const deletedRoomIds = new Set(
        (this.data.deleted_monthly_records || [])
          .filter(d => d.month === m && d.year === y)
          .map(d => d.roomId)
      );

      // Auto-create statements for active Lended rooms if not deleted
      let maxRecId = (this.data.monthly_records || []).length > 0 ? Math.max(...this.data.monthly_records.map(x => x.id || 0)) : 0;
      rooms.forEach(r => {
        if (r.status === "Lended" && !existingRoomIds.has(r.id) && !deletedRoomIds.has(r.id)) {
          maxRecId++;
          const prevMonth = (m === 1) ? 12 : m - 1;
          const prevYear = (m === 1) ? y - 1 : y;
          const prevRec = (this.data.monthly_records || []).find(mr => mr.roomId === r.id && mr.month === prevMonth && mr.year === prevYear);
          const prevMeter = prevRec ? Number(prevRec.meterCurrent || 0) : 0;

          const newRec = {
            id: maxRecId,
            roomId: r.id,
            year: y,
            month: m,
            rent: Number(r.agreedRent || 0),
            meterPrevious: prevMeter,
            meterCurrent: prevMeter,
            meterReadAt: "",
            meterRatePerUnit: Number(r.defaultMeterRate || 10),
            otherCharges: 0,
            otherChargesNote: "",
            previousBalance: 0,
            note: ""
          };
          this.data.monthly_records.push(newRec);
        }
      });
      this._saveData();

      // Assemble output with payments and calculated fields
      const out = [];
      const recordsForPeriod = (this.data.monthly_records || []).filter(mr => mr.month === m && mr.year === y);

      for (const rec of recordsForPeriod) {
        const room = (this.data.rooms || []).find(r => r.id === rec.roomId);
        if (!room) continue;
        if (bId && room.buildingId !== bId) continue;

        const bldg = (this.data.buildings || []).find(b => b.id === room.buildingId);
        const bName = bldg ? bldg.name : "Main Property";

        const payments = (this.data.payments || [])
          .filter(p => p.recordId === rec.id)
          .sort((a, b) => (b.paidAt || "").localeCompare(a.paidAt || ""));

        const units = Math.max(0, (Number(rec.meterCurrent) || 0) - (Number(rec.meterPrevious) || 0));
        const electricity = units * (Number(rec.meterRatePerUnit) || 10);
        const totalDue = (Number(rec.rent) || 0) + electricity + (Number(rec.otherCharges) || 0) + (Number(rec.previousBalance) || 0);
        const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const balance = totalDue - totalPaid;
        const isPaid = totalPaid >= totalDue && totalDue > 0;

        out.push({
          room: {
            id: room.id,
            buildingId: room.buildingId,
            buildingName: bName,
            roomNumber: room.roomNumber,
            status: room.status,
            agreedRent: Number(room.agreedRent || 0),
            defaultMeterRate: Number(room.defaultMeterRate || 10),
            tenantName: room.tenantName || "",
            lendedDate: room.lendedDate || "",
            securityDepositReceived: room.securityDepositReceived,
            securityDepositAmount: room.securityDepositAmount
          },
          record: {
            id: rec.id,
            roomId: rec.roomId,
            year: rec.year,
            month: rec.month,
            rent: Number(rec.rent || 0),
            meterPrevious: Number(rec.meterPrevious || 0),
            meterCurrent: Number(rec.meterCurrent || 0),
            meterReadAt: rec.meterReadAt || "",
            meterRatePerUnit: Number(rec.meterRatePerUnit || 10),
            otherCharges: Number(rec.otherCharges || 0),
            otherChargesNote: rec.otherChargesNote || "",
            previousBalance: Number(rec.previousBalance || 0),
            note: rec.note || "",
            units: units,
            electricity: electricity,
            totalDue: totalDue,
            totalPaid: totalPaid,
            balance: balance,
            isPaid: isPaid
          },
          payments: payments.map(p => ({
            id: p.id,
            amount: Number(p.amount || 0),
            paymentDate: p.paidAt || "",
            method: p.mode || "Cash",
            notes: p.note || "",
            paymentType: p.paymentType || "Rent",
            targetMonth: p.targetMonth || 0,
            targetYear: p.targetYear || 0
          }))
        });
      }
      return out;
    }

    async save_meter_reading(record_id, room_id, month, year, meter_prev, meter_curr,
                             meter_rate, rent, other_charges, other_note, note) {
      await this.initPromise;
      let recs = this.data.monthly_records || [];
      let target = null;
      if (record_id) {
        target = recs.find(r => r.id === Number(record_id));
      }
      if (!target) {
        target = recs.find(r => r.roomId === Number(room_id) && r.month === Number(month) && r.year === Number(year));
      }

      if (target) {
        target.meterPrevious = Number(meter_prev) || 0;
        target.meterCurrent = Number(meter_curr) || 0;
        target.meterRatePerUnit = Number(meter_rate) || 10;
        target.rent = Number(rent) || 0;
        target.otherCharges = Number(other_charges) || 0;
        target.otherChargesNote = (other_note || "").trim();
        target.note = (note || "").trim();
        target.meterReadAt = new Date().toISOString().split("T")[0];
      } else {
        const newId = recs.length > 0 ? Math.max(...recs.map(r => r.id || 0)) + 1 : 1;
        target = {
          id: newId,
          roomId: Number(room_id),
          year: Number(year),
          month: Number(month),
          rent: Number(rent) || 0,
          meterPrevious: Number(meter_prev) || 0,
          meterCurrent: Number(meter_curr) || 0,
          meterReadAt: new Date().toISOString().split("T")[0],
          meterRatePerUnit: Number(meter_rate) || 10,
          otherCharges: Number(other_charges) || 0,
          otherChargesNote: (other_note || "").trim(),
          previousBalance: 0,
          note: (note || "").trim()
        };
        recs.push(target);
      }
      this.data.monthly_records = recs;
      this._saveData();
      return { success: true, id: target.id };
    }

    async delete_monthly_record(record_id) {
      await this.initPromise;
      const recId = Number(record_id);
      const rec = (this.data.monthly_records || []).find(r => r.id === recId);
      if (rec) {
        this.data.deleted_monthly_records = this.data.deleted_monthly_records || [];
        this.data.deleted_monthly_records.push({
          roomId: rec.roomId,
          month: rec.month,
          year: rec.year
        });
        this.data.monthly_records = this.data.monthly_records.filter(r => r.id !== recId);
        this.data.payments = (this.data.payments || []).filter(p => p.recordId !== recId);
        this._saveData();
      }
      return { success: true };
    }

    // -------------------------------------------------------------------------
    // Payment Endpoints
    // -------------------------------------------------------------------------

    async record_payment(record_id, amount, paid_at, mode, note, payment_type, target_month, target_year) {
      await this.initPromise;
      const payments = this.data.payments || [];
      const newId = payments.length > 0 ? Math.max(...payments.map(p => p.id || 0)) + 1 : 1;
      const newPay = {
        id: newId,
        recordId: Number(record_id),
        paidAt: paid_at || new Date().toISOString().split("T")[0],
        amount: Number(amount) || 0,
        mode: mode || "Cash",
        note: (note || "").trim(),
        paymentType: payment_type || "Rent",
        targetMonth: Number(target_month) || 0,
        targetYear: Number(target_year) || 0
      };
      payments.push(newPay);
      this.data.payments = payments;
      this._saveData();
      return { success: true, id: newId };
    }

    async delete_payment(payment_id) {
      await this.initPromise;
      const pId = Number(payment_id);
      this.data.payments = (this.data.payments || []).filter(p => p.id !== pId);
      this._saveData();
      return { success: true };
    }

    // -------------------------------------------------------------------------
    // Utility Bills (Power Board)
    // -------------------------------------------------------------------------

    async get_utility_bill(building_id, month, year) {
      await this.initPromise;
      const bId = Number(building_id);
      const m = Number(month);
      const y = Number(year);
      const bill = (this.data.utility_bills || []).find(ub => ub.buildingId === bId && ub.month === m && ub.year === y);
      return bill || null;
    }

    async save_utility_bill(bill_id, building_id, month, year, company_amount, manual_amount, notes, units, bill_date, invoice_number) {
      await this.initPromise;
      const bills = this.data.utility_bills || [];
      let bId = Number(bill_id);
      let target = null;
      if (bId) target = bills.find(b => b.id === bId);
      if (!target) target = bills.find(b => b.buildingId === Number(building_id) && b.month === Number(month) && b.year === Number(year));

      if (target) {
        target.companyBillAmount = Number(company_amount) || 0;
        target.amount = Number(company_amount) || 0;
        target.manualCollectedAmount = Number(manual_amount) || 0;
        target.notes = (notes || "").trim();
        target.units = Number(units) || 0;
        target.billDate = bill_date || "";
        target.invoiceNumber = (invoice_number || "").trim();
      } else {
        bId = bills.length > 0 ? Math.max(...bills.map(b => b.id || 0)) + 1 : 1;
        target = {
          id: bId,
          buildingId: Number(building_id),
          month: Number(month),
          year: Number(year),
          companyBillAmount: Number(company_amount) || 0,
          amount: Number(company_amount) || 0,
          manualCollectedAmount: Number(manual_amount) || 0,
          notes: (notes || "").trim(),
          units: Number(units) || 0,
          billDate: bill_date || "",
          invoiceNumber: (invoice_number || "").trim()
        };
        bills.push(target);
      }
      this.data.utility_bills = bills;
      this._saveData();
      return { success: true, id: target.id };
    }

    async delete_utility_bill(bill_id) {
      await this.initPromise;
      const bId = Number(bill_id);
      this.data.utility_bills = (this.data.utility_bills || []).filter(b => b.id !== bId);
      this._saveData();
      return { success: true };
    }

    // -------------------------------------------------------------------------
    // Universal JSON Backup, Restore, Merge & Inspection
    // -------------------------------------------------------------------------

    async backup_database_json() {
      await this.initPromise;
      return {
        version: 5,
        app: "Rental Ledger (Universal)",
        exportedAt: new Date().toISOString(),
        compatiblePlatforms: ["iOS", "Android", "Windows", "macOS", "Web"],
        buildings: this.data.buildings || [],
        rooms: this.data.rooms || [],
        monthly_records: this.data.monthly_records || [],
        payments: this.data.payments || [],
        utility_bills: this.data.utility_bills || [],
        preferences: this.prefs
      };
    }

    async inspect_backup_json(json_content) {
      try {
        const obj = (typeof json_content === "string") ? JSON.parse(json_content) : json_content;
        return {
          success: true,
          version: obj.version || 5,
          app: obj.app || "Rental Ledger",
          exportedAt: obj.exportedAt || "Unknown",
          platforms: obj.compatiblePlatforms || ["iOS", "Android", "Windows", "macOS", "Web"],
          counts: {
            buildings: (obj.buildings || []).length,
            rooms: (obj.rooms || []).length,
            monthly_records: (obj.monthly_records || []).length,
            payments: (obj.payments || []).length,
            utility_bills: (obj.utility_bills || []).length
          }
        };
      } catch (err) {
        return { success: false, error: "Invalid JSON format: " + err.message };
      }
    }

    async restore_database_json(json_content) {
      try {
        const obj = (typeof json_content === "string") ? JSON.parse(json_content) : json_content;
        if (!obj.buildings || !obj.rooms) {
          return { success: false, error: "Missing required buildings or rooms arrays in backup file." };
        }
        this.data = {
          version: 5,
          app: "Rental Ledger (Universal)",
          exportedAt: obj.exportedAt || new Date().toISOString(),
          compatiblePlatforms: ["iOS", "Android", "Windows", "macOS", "Web"],
          buildings: obj.buildings || [],
          rooms: obj.rooms || [],
          monthly_records: obj.monthly_records || [],
          payments: obj.payments || [],
          utility_bills: obj.utility_bills || [],
          deleted_monthly_records: obj.deleted_monthly_records || []
        };
        if (obj.preferences) {
          this.prefs = { ...this.prefs, ...obj.preferences };
          this._savePrefs();
        }
        this._saveData();
        return { success: true };
      } catch (err) {
        return { success: false, error: "Restore failed: " + err.message };
      }
    }

    async merge_database_json(json_content) {
      try {
        const obj = (typeof json_content === "string") ? JSON.parse(json_content) : json_content;
        const mergeArr = (curr, incoming, idKey = "id") => {
          const map = new Map((curr || []).map(item => [item[idKey], item]));
          (incoming || []).forEach(item => {
            map.set(item[idKey], { ...(map.get(item[idKey]) || {}), ...item });
          });
          return Array.from(map.values());
        };

        this.data.buildings = mergeArr(this.data.buildings, obj.buildings);
        this.data.rooms = mergeArr(this.data.rooms, obj.rooms);
        this.data.monthly_records = mergeArr(this.data.monthly_records, obj.monthly_records);
        this.data.payments = mergeArr(this.data.payments, obj.payments);
        this.data.utility_bills = mergeArr(this.data.utility_bills, obj.utility_bills);
        this._saveData();
        return { success: true };
      } catch (err) {
        return { success: false, error: "Merge failed: " + err.message };
      }
    }

    // -------------------------------------------------------------------------
    // Export Data (CSV & PDF) & Annual Ledger Matrix
    // -------------------------------------------------------------------------

    async get_annual_matrix(building_id, year) {
      await this.initPromise;
      const y = Number(year) || new Date().getFullYear();
      const bId = (building_id !== null && building_id !== undefined && building_id !== "all") ? Number(building_id) : null;

      let rooms = this.data.rooms || [];
      if (bId) {
        rooms = rooms.filter(r => r.buildingId === bId);
      }

      // Pre-fetch/generate records for all 12 months of this year
      const monthlyData = {};
      for (let m = 1; m <= 12; m++) {
        monthlyData[m] = await this.get_records(bId, m, y);
      }

      const rows = rooms.map(room => {
        const bldg = (this.data.buildings || []).find(b => b.id === room.buildingId);
        const months = {};
        let annualDue = 0;
        let annualPaid = 0;
        let annualBalance = 0;

        for (let m = 1; m <= 12; m++) {
          const item = (monthlyData[m] || []).find(it => it.room.id === room.id);
          if (item) {
            months[m] = item;
            annualDue += (item.record.totalDue || 0);
            annualPaid += (item.record.totalPaid || 0);
            annualBalance += (item.record.balance || 0);
          } else {
            months[m] = null;
          }
        }

        return {
          room: {
            id: room.id,
            buildingId: room.buildingId,
            buildingName: bldg ? bldg.name : "Main Property",
            roomNumber: room.roomNumber,
            status: room.status,
            agreedRent: Number(room.agreedRent || 0),
            defaultMeterRate: Number(room.defaultMeterRate || 10),
            tenantName: room.tenantName || ""
          },
          months,
          annualDue,
          annualPaid,
          annualBalance,
          isAnnualCleared: annualDue > 0 && annualPaid >= annualDue
        };
      });

      const columnTotals = {};
      let grandTotalDue = 0;
      let grandTotalPaid = 0;
      let grandTotalBalance = 0;

      for (let m = 1; m <= 12; m++) {
        const list = monthlyData[m] || [];
        const mDue = list.reduce((sum, item) => sum + (item.record.totalDue || 0), 0);
        const mPaid = list.reduce((sum, item) => sum + (item.record.totalPaid || 0), 0);
        const mBal = list.reduce((sum, item) => sum + (item.record.balance || 0), 0);
        columnTotals[m] = { due: mDue, paid: mPaid, balance: mBal };
        grandTotalDue += mDue;
        grandTotalPaid += mPaid;
        grandTotalBalance += mBal;
      }

      return {
        year: y,
        buildingId: bId,
        rows,
        columnTotals,
        grandTotalDue,
        grandTotalPaid,
        grandTotalBalance
      };
    }

    async export_csv_data(arg1, arg2, arg3) {
      // Handle both (building_id, month, year) and (month, year, building_id)
      let building_id, month, year;
      if (Number(arg2) > 12 && Number(arg1) <= 12) {
        month = Number(arg1);
        year = Number(arg2);
        building_id = arg3;
      } else {
        building_id = arg1;
        month = Number(arg2);
        year = Number(arg3);
      }
      month = month || (new Date().getMonth() + 1);
      year = year || new Date().getFullYear();
      building_id = (building_id !== null && building_id !== undefined && building_id !== "all") ? Number(building_id) : null;

      const records = await this.get_records(building_id, month, year);
      const headers = ["Room", "Property", "Tenant", "Rent", "Prev Units", "Curr Units", "Consumed Units", "Rate/Unit", "Electric Bill", "Other Charges", "Total Due", "Paid", "Balance", "Status"];
      const rows = records.map(r => [
        `"${r.room.roomNumber}"`,
        `"${r.room.buildingName}"`,
        `"${r.room.tenantName}"`,
        r.record.rent,
        r.record.meterPrevious,
        r.record.meterCurrent,
        r.record.units,
        r.record.meterRatePerUnit,
        r.record.electricity,
        r.record.otherCharges,
        r.record.totalDue,
        r.record.totalPaid,
        r.record.balance,
        r.record.isPaid ? '"Paid"' : '"Pending"'
      ]);
      const csvStr = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      return { success: true, csv: csvStr, fileName: `Rental_Ledger_${year}_${month}.csv` };
    }

    async export_annual_csv_data(building_id, year) {
      const matrix = await this.get_annual_matrix(building_id, year);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const headers = ["Room", "Property", "Tenant"];
      months.forEach(m => {
        headers.push(`${m} Due`, `${m} Paid`, `${m} Bal`);
      });
      headers.push("Annual Due", "Annual Paid", "Annual Balance", "Status");

      const rows = matrix.rows.map(r => {
        const row = [
          `"${r.room.roomNumber}"`,
          `"${r.room.buildingName}"`,
          `"${r.room.tenantName}"`
        ];
        for (let m = 1; m <= 12; m++) {
          const item = r.months[m];
          if (item) {
            row.push(item.record.totalDue, item.record.totalPaid, item.record.balance);
          } else {
            row.push(0, 0, 0);
          }
        }
        row.push(r.annualDue, r.annualPaid, r.annualBalance, r.isAnnualCleared ? '"Cleared"' : (r.annualPaid > 0 ? '"Partial"' : '"Unpaid"'));
        return row;
      });

      const csvStr = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      return { success: true, csv: csvStr, fileName: `Rental_Ledger_Annual_${matrix.year}.csv` };
    }

    async export_pdf_data(month, year, building_id) {
      // In iOS PWA / web browser, window.print() is the standard native PDF generator
      window.print();
      return { success: true, printed: true };
    }

    async open_pdf_file(filePath) {
      window.print();
      return { success: true };
    }
  }

  // Register on window
  window.pwaStorage = new PWAStorageEngine();
})();
