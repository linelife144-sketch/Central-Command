import type { TicketOcrExtractor } from './types';

function extractMatch(text: string, regex: RegExp): string | undefined {
  const match = text.match(regex);
  return match?.[1]?.trim();
}

function confidence(value: unknown): number {
  return typeof value === 'string' && value.length > 0 ? 0.9 : 0.0;
}

export const extractEntergyFields: TicketOcrExtractor = (ocrText) => {
  const incident_number = extractMatch(ocrText, /Incident\s*Number\s*:?\s*(\d{10})/i);
  const incident_type = extractMatch(ocrText, /Incident\s*Type\s*:?\s*([A-Z]{2,10})/i);
  const address_line = extractMatch(ocrText, /Address\s*:?\s*([^\n]+)/i);
  const feeder = extractMatch(ocrText, /Feeder\s*:?\s*([A-Z0-9-]+)/i);
  const device_name = extractMatch(ocrText, /Device\s*Name\s*:?\s*([A-Z0-9-]+)/i);

  const warnings: string[] = [];
  if (!incident_number) warnings.push('Unable to confidently extract incident number.');
  if (!address_line) warnings.push('Unable to confidently extract address.');

  return {
    payloadDraft: {
      incident_number: incident_number ?? '',
      incident_type: incident_type ?? 'OTHER',
      address_line: address_line ?? '',
      feeder,
      device_name,
      ticket_generated_by: 'OCR',
    },
    confidenceByField: {
      incident_number: confidence(incident_number),
      incident_type: confidence(incident_type),
      address_line: confidence(address_line),
      feeder: confidence(feeder),
      device_name: confidence(device_name),
    },
    warnings,
  };
};
