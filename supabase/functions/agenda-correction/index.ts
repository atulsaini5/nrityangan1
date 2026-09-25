import { createCorrectionHandler } from './handler.ts';

Deno.serve(createCorrectionHandler({ credentials: () => {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  return accountSid && authToken ? { accountSid, authToken } : undefined;
} }));
