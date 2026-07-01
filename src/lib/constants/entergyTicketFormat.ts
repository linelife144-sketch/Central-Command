export interface EntergyTicketFormatInput {
  incidentNumber: string;
  incidentType: string;
  sourceAddress: string;
  city: string;
  state: string;
  zipCode: string;
  calls?: number;
  affectedCustomers?: number;
  durationHours?: number;
  workOrderId?: string;
  deviceName: string;
  deviceType: string;
  startTime: string;
  ert: string;
  network: string;
  feeder: string;
  localOffice: string;
  substation: string;
  polesDown?: number;
  transformersDown?: number;
  crossArms?: number;
  conductorSpan?: number;
  services?: number;
  treeTrim?: number;
  dispatcherComments?: string;
  crewComments?: string;
  needScout?: boolean;
  firstCustomerComment?: string;
}

function countLine(label: string, value?: number): string {
  return `${label}: ${typeof value === 'number' ? value : 'N/A'}`;
}

export function buildEntergyWorkDescription(input: EntergyTicketFormatInput): string {
  const lines = [
    'Entergy Incident Summary Report',
    `Incident Number: ${input.incidentNumber}`,
    `Incident Type: ${input.incidentType}`,
    countLine('Affected Customers', input.affectedCustomers),
    input.workOrderId ? `Work Order ID: ${input.workOrderId}` : 'Work Order ID: N/A',
    `Address: ${input.sourceAddress}, ${input.city}, ${input.state} ${input.zipCode}`,
    countLine('Calls', input.calls),
    `Device: ${input.deviceName} (${input.deviceType})`,
    `Start Time: ${input.startTime}`,
    `ERT: ${input.ert}`,
    typeof input.durationHours === 'number' ? `Duration: ${input.durationHours} h` : 'Duration: N/A',
    `Network: ${input.network}`,
    `Feeder: ${input.feeder}`,
    `Local Office: ${input.localOffice}`,
    `Substation: ${input.substation}`,
    'Damage Assessment',
    countLine('Poles Down', input.polesDown),
    countLine('Transformers Down', input.transformersDown),
    countLine('Conductor Span', input.conductorSpan),
    countLine('Services', input.services),
    countLine('Cross Arms', input.crossArms),
    countLine('Tree Trim', input.treeTrim),
  ];

  return lines.filter(Boolean).join('\n');
}

export function buildEntergySpecialInstructions(input: EntergyTicketFormatInput): string | null {
  const lines = [
    input.dispatcherComments?.trim() ? `Dispatcher Comments: ${input.dispatcherComments.trim()}` : 'Dispatcher Comments: N/A',
    input.crewComments?.trim() ? `Crew Comments: ${input.crewComments.trim()}` : 'Crew Comments: N/A',
    typeof input.needScout === 'boolean' ? `Need Scout: ${input.needScout ? 'Yes' : 'No'}` : 'Need Scout: N/A',
    input.firstCustomerComment?.trim()
      ? `First Customer Comment: ${input.firstCustomerComment.trim()}`
      : 'First Customer Comment: N/A',
  ];

  return lines.join('\n');
}
