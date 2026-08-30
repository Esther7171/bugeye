import { useState } from 'react';
import { CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import type { ModuleComponentProps } from '@/types';

interface PhoneResult {
  valid: boolean;
  country?: string;
  countryCallingCode?: string;
  type?: string;
  international?: string;
  national?: string;
  e164?: string;
}

export function PhoneAnalyze({ onBack }: ModuleComponentProps) {
  const [number, setNumber] = useState('');
  const [defaultCountry, setDefaultCountry] = useState('US');
  const [result, setResult] = useState<PhoneResult | null>(null);

  function analyze() {
    try {
      const parsed = parsePhoneNumberFromString(number, defaultCountry.toUpperCase() as CountryCode);
      if (!parsed) {
        setResult({ valid: false });
        return;
      }
      setResult({
        valid: parsed.isValid(),
        country: parsed.country,
        countryCallingCode: parsed.countryCallingCode,
        type: parsed.getType(),
        international: parsed.formatInternational(),
        national: parsed.formatNational(),
        e164: parsed.format('E.164'),
      });
    } catch {
      setResult({ valid: false });
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="PhoneAnalyze"
        description="Parses a phone number: country, region, line type and format validity."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <ShieldAlert className="size-3.5 shrink-0" />
          <p>
            Parsing happens entirely offline in your browser; nothing is sent anywhere. Only analyze
            numbers you own or are explicitly authorized to test.
          </p>
        </div>

        <div className="flex gap-2">
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+1 415 555 2671" className="flex-1" />
          <div className="flex items-center gap-1.5">
            <Label className="text-muted-foreground">Default country</Label>
            <Input
              value={defaultCountry}
              onChange={(e) => setDefaultCountry(e.target.value.toUpperCase().slice(0, 2))}
              className="w-14"
            />
          </div>
        </div>
        <Button size="sm" onClick={analyze} disabled={!number.trim()} className="w-fit">
          Analyze
        </Button>

        {result && (
          <Card>
            <CardContent className="flex flex-col gap-2 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span>Valid</span>
                {result.valid ? <CheckCircle2 className="size-3.5 text-success" /> : <XCircle className="size-3.5 text-destructive" />}
              </div>
              {result.valid && (
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <span className="text-muted-foreground">Country</span>
                  <span>{result.country ?? '-'}</span>
                  <span className="text-muted-foreground">Calling code</span>
                  <span>+{result.countryCallingCode}</span>
                  <span className="text-muted-foreground">Line type</span>
                  <span>{result.type ?? 'Unknown (not disclosed by this number range)'}</span>
                  <span className="text-muted-foreground">International</span>
                  <span>{result.international}</span>
                  <span className="text-muted-foreground">National</span>
                  <span>{result.national}</span>
                  <span className="text-muted-foreground">E.164</span>
                  <span>{result.e164}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-[11px] text-muted-foreground">
          Carrier names are not reliably derivable client-side; line type (mobile/fixed/VOIP/etc.) is
          shown instead where the number range discloses it.
        </p>
      </div>
    </div>
  );
}

export default PhoneAnalyze;
