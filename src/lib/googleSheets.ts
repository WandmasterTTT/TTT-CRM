// GoogleSheets.ts (fully fixed version)
import { localSecrets } from './localSecrets';

export interface SheetLead {
  tripId: string;
  date: string;
  consultant: string;
  status: string;
  travellerName: string;
  travelDate: string;
  travelState: string;
  remarks: string;
  nights: string;
  pax: string;
  hotelCategory: string;
  mealPlan: string;
  phone: string;
  email: string;
  priority?: string;
  notes?: string;
}

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export class GoogleSheets {
  private sheetId: string;
  private worksheetNames: string[];
  private columnMappings: Record<string, string>;
  private serviceAccountJson: string;
  private apiKey: string;

  constructor() {
    this.sheetId = this.extractSheetId(localSecrets.spreadsheetUrl);
    this.worksheetNames = localSecrets.worksheetNames;
    this.columnMappings = localSecrets.columnMappings;
    this.serviceAccountJson = localSecrets.serviceAccountJson;
    this.apiKey = localSecrets.googleApiKey;
  }

  private extractSheetId(url: string) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '';
  }

  private columnToIndex(col: string): number {
    let index = 0;
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return index - 1;
  }

  private async getAccessToken(): Promise<string> {
    if (!this.serviceAccountJson) throw new Error('Service Account JSON required.');
    const serviceAccount = JSON.parse(this.serviceAccountJson);

    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600;
    const header = { alg: 'RS256', typ: 'JWT', kid: serviceAccount.private_key_id };
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: expiry,
      iat: now,
    };

    const base64url = (str: string) =>
      btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const unsignedToken = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

    const pemContents = serviceAccount.private_key
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );
    const jwt = `${unsignedToken}.${base64url(
      String.fromCharCode(...new Uint8Array(signature))
    )}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!res.ok) throw new Error('Failed to get access token.');
    const data = await res.json();
    return data.access_token;
  }

  /** Fetch all leads (read-only for display) */
  async fetchLeads(): Promise<SheetLead[]> {
    const worksheetName = this.worksheetNames[0] || 'MASTER DATA';
    const cm = this.columnMappings;
    const range = `${worksheetName}!A2:AZ10000`;
    const url = `${SHEETS_API_BASE}/${this.sheetId}/values/${encodeURIComponent(
      range
    )}?key=${this.apiKey}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch leads.');
    const data = await res.json();
    const rows = data.values || [];

    return rows.map((row: any[]) => {
      const lead: any = {};
      for (const [key, col] of Object.entries(cm)) {
        lead[key] = row[this.columnToIndex(col)] || '';
      }
      return lead as SheetLead;
    });
  }

  /** Append a new lead */
  async appendLead(lead: Partial<SheetLead>) {
    const token = await this.getAccessToken();
    const worksheetName = this.worksheetNames[0] || 'MASTER DATA';
    const cm = this.columnMappings;

    const maxCol = Math.max(...Object.values(cm).map((c) => this.columnToIndex(c)));
    const row: any[] = new Array(maxCol + 1).fill('');

    for (const [key, col] of Object.entries(cm)) {
      if (key === 'tripId') row[this.columnToIndex(col)] = lead.tripId || `T${Date.now()}`;
      else if (lead[key as keyof SheetLead] !== undefined)
        row[this.columnToIndex(col)] = lead[key as keyof SheetLead];
    }

    const url = `${SHEETS_API_BASE}/${this.sheetId}/values/${encodeURIComponent(
      worksheetName
    )}:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ values: [row] }),
    });

    if (!res.ok) throw new Error(`Failed to append lead: ${await res.text()}`);
  }

  /** 🔧 Update existing lead by Trip ID (FULL FIXED VERSION) */
  async updateLead(tripId: string, updates: Partial<SheetLead>) {
    try {
      const token = await this.getAccessToken();
      const worksheetName = this.worksheetNames[0] || 'MASTER DATA';
      const cm = this.columnMappings;

      // Step 1: find Trip ID row
      const tripIdCol = cm.tripId || 'A';
      const range = `${worksheetName}!${tripIdCol}2:${tripIdCol}10000`;
      const findUrl = `${SHEETS_API_BASE}/${this.sheetId}/values/${encodeURIComponent(
        range
      )}?majorDimension=COLUMNS`;
      const resFind = await fetch(findUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataFind = await resFind.json();
      if (!resFind.ok)
        throw new Error(`Failed to read Trip IDs: ${JSON.stringify(dataFind)}`);

      const colVals: string[] = (dataFind.values && dataFind.values[0]) || [];
      const rowIndex = colVals.findIndex((v) => String(v) === String(tripId));
      if (rowIndex === -1) {
        alert(`⚠️ Trip ID ${tripId} not found in Google Sheet.`);
        throw new Error(`Trip ID ${tripId} not found.`);
      }

      const rowNumber = rowIndex + 2; // add 2 for header offset

      // Step 2: build data updates
      const data = Object.entries(updates)
        .filter(([key, val]) => val !== undefined && cm[key])
        .map(([key, val]) => ({
          range: `${worksheetName}!${cm[key]}${rowNumber}`,
          values: [[val]],
        }));

      if (data.length === 0) {
        console.warn('No valid fields to update for lead:', tripId);
        return;
      }

      // Step 3: batch update
      const batchUrl = `${SHEETS_API_BASE}/${this.sheetId}/values:batchUpdate`;
      const res = await fetch(batchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        console.error('❌ Google Sheet update failed:', result);
        alert(`❌ Lead update failed: ${result.error?.message || res.statusText}`);
        return;
      }

      console.log('✅ Lead updated in Sheet:', result);
      alert('✅ Lead updated in Sheet successfully!');
    } catch (err: any) {
      console.error('UpdateLead error:', err);
      alert(`❌ Error updating lead: ${err.message || err}`);
    }
  }
}
