import { Resend } from 'resend';
import React from 'react';

if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email functionality will be disabled.");
}

const resend = new Resend(process.env.RESEND_API_KEY);

// Replace with your verified sending domain or use Resend's default for testing
// IMPORTANT: Using a generic address might affect deliverability.
const FROM_EMAIL = process.env.EMAIL_FROM || 'CVMatch <onboarding@resend.dev>'; 

interface SendEmailOptions {
    to: string;
    subject: string;
    react: React.ReactElement; // Use React component for email body
}

export async function sendEmail({ to, subject, react }: SendEmailOptions): Promise<boolean> {
    if (!process.env.RESEND_API_KEY) {
        console.error("Cannot send email: RESEND_API_KEY is not configured.");
        return false; // Indicate failure if API key is missing
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [to], // Resend expects an array
            subject: subject,
            react: react, // Pass the React component directly
        });

        if (error) {
            console.error('Resend API Error:', error);
            return false; // Indicate failure
        }

        console.log('Email sent successfully:', data);
        return true; // Indicate success
    } catch (error) {
        console.error('Error sending email:', error);
        return false; // Indicate failure on exception
    }
} 