# Official Entergy forms - source coverage

Sources were visually inspected as one-page scanned images on 2026-10-06. They contain no extractable text or AcroForm widgets. The source Distribution Change Order is labeled Damage assessment in Central Command; its printed revision is 02-25-2019. Printed operational directions are displayed as source reference only. No contact was made or field action performed.

## Clean-up form

Source: Entergy Clean-up Form.pdf
SHA-256: `abaea90a281043377106cd9b906b35fd05513efa32d54af8f407c0605605d4e5`

### Cleanup scope

- Environmental cleanup (notes)
- Trash cleanup (material type & amount) (notes)

### Site & access

- Address (text)
- City/Town (text)
- DLOC (text)
- Truck access (boolean)

### Field notes

- Notes (notes)

## Damage assessment

Source: Entergy Distribution Change Order.pdf
SHA-256: `18f22a412ec467aed7ed31aa9caf6ecff66985f414e526aa91081b6158d8072f`

### Equipment & activity

- Date (date)
- Equipment type: Transformer, Recloser, Regulator, Switch, Switch Gear, Pole, AutoTransformer, Streetlight, Capacitor, Breaker, Sectionalizer, Fault Indicator, Communication Device, Private Area Light
- Activity: Install, Relocate, Remove, Install/Remove, Other, Misc.

### From / to location

- From · Local office (text)
- From · Store room (text)
- From · Distribution location number (DLOC) (text)
- To · Local office (text)
- To · Store room (text)
- To · Distribution location number (DLOC) (text)
- GPS · LAT (latitude)
- GPS · LONG (longitude)

### Equipment register

6 initial rows; up to 60. Blank unused rows are retained in saved data.

- Install / remove: Install, Remove
- Type (text)
- Size (text)
- Company equipment number (text)
- Manufacturer serial number (text)
- Phase: A, B, C
- Field phase: F, M, R, T, C, B
- Rec/Reg/Cap counter reading (text)

### Transformer & feeder

- Phase · Change (boolean)
- Transformer installation purpose: Change, Metered Customer, UnMetered Customer, Lighting, Behind Primary Meter, Company Line, Company Substation
- Voltage · Pri. (text)
- Voltage · Sec. (text)
- Idle transformer inspection: Reuse, Rebuild, Scrap, Spare, Inactive
- Transformer bank secondary connection: Wye, Delta
- Feeder no. (text)
- Feeder · Change (boolean)

### Lighting

- Street light · Wattage (text)
- Street light · Type (text)
- Private area light · Wattage (text)
- Private area light · Type (text)

### Customer & field address

- Customer (text)
- Field address/comments (notes)

### Disconnect / lateral / bypass switch / switch gear / status

- Switch type: Disconnect, GOAB, Fuse, Switch Gear
- Installed # (text)
- Removed # (text)
- Quantity (text)
- Switch size (text)
- Switch type (specification) (text)
- Change status: New, Replace, Change
- Switch position: Open, Closed, Bypass
- Switch manufacturer # (text)
- Catalog # (text)
- Manufacturer serial # (text)
- Manufacturer date (date)
- Bypass switch type: Disconnect, Fuse, Solid Blade, GOAB, Fuse Around, Other
- Bypass size (text)
- Bypass type (specification) (text)

### Pole change out

- Install size/class (text)
- Remove size/class (text)
- Owner: Company, ATT, Other
- Other owner (text)

### Communication devices

- Type of comm device: Access Point (AP), Relay (RY)
- COMM equipment # (text)
- COMM serial # (text)
- Battery equipment # (text)
- Battery serial # (text)
- Antenna location: w/COMM, Other Location
- Reason for change: PID, Replacement, New Installation

### Controls

- Control equipment # (text)
- Control serial # (text)
- COMM bridge equipment # (text)
- COMM bridge serial # (text)
- Battery 1 equipment # (text)
- Battery 1 serial # (text)
- Battery 2 equipment # (text)
- Battery 2 serial # (text)
- Reason for change: PID, Replacement, New Installation

### Customer transfers

3 initial rows; up to 60. Blank unused rows are retained in saved data.

- Customer name or address (text)
- Identifier type: Account #, Meter #, Net Metering #
- Account / meter / net metering number (text)
- Old DLOC or trans. # (text)
- New DLOC or trans. # (text)

### Sign-off

- Signature (text)
- Work order # (text)
- Employee ID (text)

## Application additions

Separate ticket-linked draft/submitted records; actor-scoped offline storage; conflict detection; original source links; four GPS-verified photo views at submission; optional damage reports with required section photos; completed-ticket report attachments. These additions preserve the existing crew dispatch and two-stage ticket approval gates.

Customer identifier-type checkboxes are available per customer row, covering the source header choices. Company/serial/DLOC/work-order/employee identifiers remain text to retain leading zeros. Phase Change and Feeder Change checkboxes become explicit optional Yes/No controls; unanswered remains distinct from No. Equipment operation starts with the three printed Install/Remove pairs.

## User-directed exception (2026-10-06)

The user requested removal of the lighting map section. The drawing control, legend input, map rendering in saved-form readback/reports, and map-required submission rule are removed. Street light and private area light wattage/type remain. Earlier saved map/legend data is retained for compatibility and is not displayed.
