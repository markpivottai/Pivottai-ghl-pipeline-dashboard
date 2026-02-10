
/**
 * Formats a number as currency ($X,XXX)
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Formats a decimal (e.g., 0.5) as a percentage (e.g., 50%)
 */
export const formatPercent = (value: number): string => {
  return `${Math.round(value * 100)}%`;
};

/**
 * Formats a number with thousand separators
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

/**
 * Extracts and cleans the Google Sheets JSON response
 */
export const parseGoogleSheetsJSON = (text: string): any => {
  try {
    // The response is usually wrapped in a function call:
    // /*O_o*/\ngoogle.visualization.Query.setResponse({"version":"0.6","reqId":"0","status":"ok","table":{...}});
    const jsonString = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to parse Google Sheets response', error);
    throw new Error('Invalid data format from Google Sheets');
  }
};
