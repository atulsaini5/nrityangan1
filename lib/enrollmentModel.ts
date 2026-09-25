export const CONSENT_VERSION = '2026-09-25.1';
export const EMAIL_CONSENT = 'I agree to receive email from Nrityangan Kathak Studio about class reminders, schedule changes, enrollment and studio activities. This choice is optional. I can withdraw at any time using my private preferences link or by contacting the studio.';
export const SMS_CONSENT = 'I agree to receive recurring automated SMS messages from Nrityangan Kathak Studio at the mobile number I provide about class reminders, schedule changes, enrollment and studio activities. Message frequency varies. Message and data rates may apply. Consent is not a condition of enrollment or purchase. Reply STOP to opt out or HELP for help when messaging begins, or use my private preferences link or contact the studio at (425) 785-5217.';
export const ADULT_ATTESTATION = 'I am at least 18 years old and am enrolling myself or am the parent or legal guardian of the student. I am authorized to provide the contact details and messaging choices below.';
export type EnrollmentInput = {
 request_key: string; preference_token: string; student_name: string; contact_name: string;
 relationship: 'self' | 'parent_guardian'; email: string; phone: string; class_id: string;
 academic_year: string; notes: string; email_opt_in: boolean; sms_opt_in: boolean;
 adult_attestation: boolean; consent_version: string; website: string;
};
export function normalizePhone(value: string) {
 const digits=value.replace(/[\s().-]/g,'');
 if(/^\d{10}$/.test(digits))return '+1'+digits;
 if(/^1\d{10}$/.test(digits))return '+'+digits;
 return digits;
}
export function validateEnrollment(value: unknown): EnrollmentInput {
 if(!value || typeof value!=='object')throw new Error('Please complete the enrollment form.');
 const v=value as EnrollmentInput;
 const text=(s:unknown,max:number,required=false)=>typeof s==='string' && s.length<=max && (!required || !!s.trim());
 if(!text(v.student_name,160,true)||!text(v.contact_name,160,true)||!text(v.notes,2000)||!text(v.class_id,80)||!text(v.website,200))throw new Error('Check the student name, contact name and notes.');
 if(!text(v.email,254,true)||!/^\S+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()))throw new Error('Enter a valid contact email.');
 if(!text(v.phone,40))throw new Error('Enter a valid phone number.');
 const phone=normalizePhone(v.phone.trim());
 if(phone&&!/^\+[1-9]\d{7,14}$/.test(phone))throw new Error('Use a 10-digit US number or an international number starting with +.');
 if(typeof v.email_opt_in!=='boolean'||typeof v.sms_opt_in!=='boolean'||v.sms_opt_in&&!phone)throw new Error('SMS consent requires a mobile phone number.');
 if(v.adult_attestation!==true||!['self','parent_guardian'].includes(v.relationship))throw new Error('An adult student or parent/legal guardian must submit this form.');
 if(v.consent_version!==CONSENT_VERSION)throw new Error('This form has changed. Reload it and review the messaging choices.');
 if(!/^20\d{2}-\d{2}$/.test(v.academic_year)||Number(v.academic_year.slice(-2))!==(Number(v.academic_year.slice(0,4))+1)%100)throw new Error('Enter an academic year such as 2026-27.');
 if(!/^[0-9a-f-]{36}$/i.test(v.request_key)||!/^[0-9a-f]{64}$/.test(v.preference_token))throw new Error('Reload the form and try again.');
 return {...v,student_name:v.student_name.trim(),contact_name:v.contact_name.trim(),email:v.email.trim().toLowerCase(),phone,notes:v.notes.trim()};
}
