import { api } from './api';

export const googleSheetsSyncService = {
  /**
   * Pushes the current local inventory (database) to the connected Google Sheets.
   * This overrides the Sheets data with the local application data.
   * @param token Google OAuth Access Token
   */
  async pushLocalInventory(token: string): Promise<{ success: boolean; message?: string; spreadsheetId?: string }> {
    try {
      const res = await fetch('/api/sync/sheets/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to push inventory to Google Sheets');
      }
      
      return await res.json();
    } catch (error: any) {
      console.error('pushLocalInventory error:', error);
      throw error;
    }
  },

  /**
   * Fetches the latest inventory data from Google Sheets and updates the local database.
   * This pulls the Google Sheets data into the application.
   * @param token Google OAuth Access Token
   */
  async fetchLatestSheetData(token: string): Promise<{ success: boolean; message?: string; spreadsheetId?: string }> {
    try {
      const res = await fetch('/api/sync/sheets/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to pull inventory from Google Sheets');
      }
      
      return await res.json();
    } catch (error: any) {
      console.error('fetchLatestSheetData error:', error);
      throw error;
    }
  }
};
