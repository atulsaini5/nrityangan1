import { createCorrectionHandler } from './handler.ts';

Deno.serve(createCorrectionHandler({ apiKey: () => Deno.env.get('SENDGRID_API_KEY') }));
